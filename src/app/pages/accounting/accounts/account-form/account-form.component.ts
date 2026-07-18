import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AccountGroup } from '../../../../core/api/models/account-group.models';
import {
  Account,
  AccountCategory,
  AccountNatureType,
  AccountStructureType,
  CreateAccountRequest,
  UpdateAccountRequest,
} from '../../../../core/api/models/account.models';
import { CostCenter } from '../../../../core/api/models/cost-center.models';
import { Currency } from '../../../../core/api/models/currency.models';
import { CommonTaxTypes, TaxSetup } from '../../../../core/api/models/tax-setup.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountGroupsService } from '../../../../core/services/account-groups.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { LanguageService } from '../../../../core/services/language.service';
import { TaxSetupsService } from '../../../../core/services/tax-setups.service';

@Component({
  selector: 'app-account-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './account-form.component.html',
  styleUrl: './account-form.component.scss',
})
export class AccountFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private accountsService = inject(AccountsService);
  private accountGroupsService = inject(AccountGroupsService);
  private currenciesService = inject(CurrenciesService);
  private costCentersService = inject(CostCentersService);
  private taxSetupsService = inject(TaxSetupsService);
  private language = inject(LanguageService);

  readonly AccountStructureType = AccountStructureType;
  readonly AccountNatureType = AccountNatureType;
  readonly AccountCategory = AccountCategory;

  loading = signal(false);
  saving = signal(false);
  suggestingCode = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  accountId = signal<number | null>(null);
  groups = signal<AccountGroup[]>([]);
  currencies = signal<Currency[]>([]);
  costCenters = signal<CostCenter[]>([]);
  taxSetups = signal<TaxSetup[]>([]);
  allAccounts = signal<Account[]>([]);
  parentPreset = signal<Account | null>(null);

  parentOptions = computed(() => {
    const currentId = this.accountId();
    return this.allAccounts()
      .filter((account) => account.accId !== currentId)
      .sort((a, b) => a.accCode - b.accCode);
  });

  taxTypeOptions = computed(() => {
    const fromSetups = this.taxSetups()
      .map((item) => item.taxType)
      .filter((value): value is string => !!value);
    return [...new Set([...CommonTaxTypes, ...fromSetups])];
  });

  form = new FormGroup({
    accCode: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    accName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    accName2: new FormControl('', { nonNullable: true }),
    accType: new FormControl<number | null>(AccountStructureType.Sub),
    accParent: new FormControl<number | null>(null),
    accDmType: new FormControl<number | null>(AccountNatureType.Debit),
    accountCategory: new FormControl<number | null>(null),
    groupId: new FormControl<number | null>(null),
    currencyId: new FormControl<number | null>(null),
    costCenterId: new FormControl<number | null>(null),
    taxType: new FormControl('', { nonNullable: true }),
    accNote: new FormControl('', { nonNullable: true }),
    reasonsStop: new FormControl('', { nonNullable: true }),
    accStopped: new FormControl(false, { nonNullable: true }),
    isBranchRequired: new FormControl(false, { nonNullable: true }),
    isCostCenterRequired: new FormControl(false, { nonNullable: true }),
    isLinkWithGroup: new FormControl(false, { nonNullable: true }),
    isMultiCurrency: new FormControl(false, { nonNullable: true }),
    isTaxable: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadLookups();
    this.wireConditionalValidators();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.isEditMode.set(true);
      this.accountId.set(id);
      this.loadAccount(id);
      return;
    }

    const parentIdParam = this.route.snapshot.queryParamMap.get('parentId');
    if (parentIdParam) {
      const parentId = Number(parentIdParam);
      this.form.controls.accParent.setValue(parentId);
      this.form.controls.accType.setValue(AccountStructureType.Sub);
      this.applyParentDefaults(parentId);
    } else {
      this.form.controls.accType.setValue(AccountStructureType.Main);
    }
  }

  loadLookups(): void {
    this.accountGroupsService.getAll().subscribe({
      next: (groups) => this.groups.set(groups),
    });
    this.currenciesService.getAll().subscribe({
      next: (currencies) => this.currencies.set(currencies),
    });
    this.costCentersService.getActive().subscribe({
      next: (items) => this.costCenters.set(items),
      error: () => {
        this.costCentersService.getAll().subscribe({
          next: (items) => this.costCenters.set(items.filter((item) => item.isActive)),
        });
      },
    });
    this.taxSetupsService.getActive().subscribe({
      next: (items) => this.taxSetups.set(items),
      error: () => {
        this.taxSetupsService.getAll().subscribe({
          next: (items) => this.taxSetups.set(items.filter((item) => item.isActive)),
        });
      },
    });
    this.accountsService.getAll().subscribe({
      next: (accounts) => {
        this.allAccounts.set(accounts);
        const parentId = this.form.controls.accParent.value;
        if (parentId != null && !this.isEditMode()) {
          this.applyParentDefaults(parentId);
          if (this.form.controls.accCode.value == null) {
            this.suggestCode();
          }
        }
      },
    });
  }

  loadAccount(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountsService.getById(id).subscribe({
      next: (account) => {
        this.form.patchValue({
          accCode: account.accCode,
          accName: account.accName ?? '',
          accName2: account.accName2 ?? '',
          accType: account.accType ?? null,
          accParent: account.accParent ?? null,
          accDmType: account.accDmType ?? null,
          accountCategory: account.accountCategory ?? null,
          groupId: account.groupId ?? null,
          currencyId: account.currencyId ?? null,
          costCenterId: account.costCenterId ?? null,
          taxType: account.taxType ?? '',
          accNote: account.accNote ?? '',
          reasonsStop: account.reasonsStop ?? '',
          accStopped: account.accStopped ?? false,
          isBranchRequired: account.isBranchRequired ?? false,
          isCostCenterRequired: account.isCostCenterRequired ?? false,
          isLinkWithGroup: account.isLinkWithGroup ?? false,
          isMultiCurrency: account.isMultiCurrency ?? false,
          isTaxable: account.isTaxable ?? false,
        });
        this.syncConditionalValidators();
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accounts.notFound')),
        );
      },
    });
  }

  onParentChange(parentId: number | null): void {
    this.form.controls.accParent.setValue(parentId);
    if (!this.isEditMode() && parentId != null) {
      this.applyParentDefaults(parentId);
      this.suggestCode();
    }
  }

  onCostCenterRequiredChange(): void {
    this.syncConditionalValidators();
  }

  onTaxableChange(): void {
    this.syncConditionalValidators();
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  costCenterLabel(item: CostCenter): string {
    return `${item.costCenterCode || item.costCenterId} — ${item.costCenterName || ''}`;
  }

  suggestCode(): void {
    const parentId = this.form.controls.accParent.value;
    const parent = this.allAccounts().find((item) => item.accId === parentId);
    const parentCode = parent?.accCode ?? null;
    const accType = this.form.controls.accType.value;

    this.suggestingCode.set(true);
    this.accountsService.getNextCode(parentCode, accType).subscribe({
      next: (code) => {
        this.form.controls.accCode.setValue(code);
        this.suggestingCode.set(false);
      },
      error: (error) => {
        this.suggestingCode.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accounts.saveError')),
        );
      },
    });
  }

  onSubmit(): void {
    this.syncConditionalValidators();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const payload: CreateAccountRequest | UpdateAccountRequest = {
      accCode: Number(raw.accCode),
      accName: raw.accName.trim(),
      accName2: raw.accName2.trim() || null,
      accType: raw.accType,
      accParent: raw.accParent,
      accDmType: raw.accDmType,
      accountCategory: raw.accountCategory,
      groupId: raw.groupId,
      currencyId: raw.currencyId,
      costCenterId: raw.isCostCenterRequired || raw.costCenterId != null ? raw.costCenterId : null,
      taxType: raw.isTaxable ? raw.taxType.trim() || null : null,
      accNote: raw.accNote.trim() || null,
      reasonsStop: raw.reasonsStop.trim() || null,
      accStopped: raw.accStopped,
      isBranchRequired: raw.isBranchRequired,
      isCostCenterRequired: raw.isCostCenterRequired,
      isLinkWithGroup: raw.isLinkWithGroup,
      isMultiCurrency: raw.isMultiCurrency,
      isTaxable: raw.isTaxable,
    };

    if (this.isEditMode()) {
      const id = this.accountId();
      if (!id) {
        return;
      }

      this.accountsService.update(id, payload).subscribe({
        next: (account) => this.navigateBack('accounts.updateSuccess', account.accId),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.accountsService.create(payload).subscribe({
      next: (account) => this.navigateBack('accounts.createSuccess', account.accId),
      error: (error) => this.handleSaveError(error),
    });
  }

  private wireConditionalValidators(): void {
    this.form.controls.isCostCenterRequired.valueChanges.subscribe(() =>
      this.syncConditionalValidators(),
    );
    this.form.controls.isTaxable.valueChanges.subscribe(() => this.syncConditionalValidators());
  }

  private syncConditionalValidators(): void {
    const costCenterCtrl = this.form.controls.costCenterId;
    const taxTypeCtrl = this.form.controls.taxType;

    if (this.form.controls.isCostCenterRequired.value) {
      costCenterCtrl.setValidators([Validators.required]);
    } else {
      costCenterCtrl.clearValidators();
    }

    if (this.form.controls.isTaxable.value) {
      taxTypeCtrl.setValidators([Validators.required]);
    } else {
      taxTypeCtrl.clearValidators();
    }

    costCenterCtrl.updateValueAndValidity({ emitEvent: false });
    taxTypeCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private applyParentDefaults(parentId: number): void {
    const parent = this.allAccounts().find((item) => item.accId === parentId) ?? null;
    this.parentPreset.set(parent);
    if (!parent) {
      return;
    }

    this.form.patchValue({
      accDmType: parent.accDmType ?? this.form.controls.accDmType.value,
      accountCategory: parent.accountCategory ?? this.form.controls.accountCategory.value,
      groupId: parent.groupId ?? this.form.controls.groupId.value,
      currencyId: parent.currencyId ?? this.form.controls.currencyId.value,
      costCenterId: parent.costCenterId ?? this.form.controls.costCenterId.value,
      taxType: parent.taxType ?? this.form.controls.taxType.value,
      isBranchRequired: parent.isBranchRequired ?? false,
      isCostCenterRequired: parent.isCostCenterRequired ?? false,
      isMultiCurrency: parent.isMultiCurrency ?? false,
      isTaxable: parent.isTaxable ?? false,
    });
    this.syncConditionalValidators();
  }

  private navigateBack(messageKey: TranslationKey, selectId?: number): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/accounts'], {
      state: {
        successMessage: this.language.translate(messageKey),
        selectId,
      },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('accounts.saveError')),
    );
  }
}
