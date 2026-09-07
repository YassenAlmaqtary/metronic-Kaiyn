import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import {
  CreateItemAccountingPolicyRequest,
  CreateItemAccountingPolicyRuleRequest,
  ItemAccountingItemType,
  ItemAccountingOperationType,
  ItemAccountingPolicyRule,
  UpdateItemAccountingPolicyRequest,
} from '../../../../core/api/models/item-accounting-policy.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { ItemAccountingPoliciesService } from '../../../../core/services/item-accounting-policies.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-item-accounting-policy-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './item-accounting-policy-form.component.html',
  styleUrl: './item-accounting-policy-form.component.scss',
})
export class ItemAccountingPolicyFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private policiesService = inject(ItemAccountingPoliciesService);
  private accountsService = inject(AccountsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  addingRule = signal(false);
  deletingRuleId = signal<number | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  isEditMode = signal(false);
  policyId = signal<number | null>(null);
  rules = signal<ItemAccountingPolicyRule[]>([]);
  accounts = signal<Account[]>([]);

  readonly itemTypeOptions = [
    { value: ItemAccountingItemType.Inventory, labelKey: 'itemAccountingPolicies.itemType.inventory' },
    { value: ItemAccountingItemType.Service, labelKey: 'itemAccountingPolicies.itemType.service' },
    { value: ItemAccountingItemType.Asset, labelKey: 'itemAccountingPolicies.itemType.asset' },
    { value: ItemAccountingItemType.Other, labelKey: 'itemAccountingPolicies.itemType.other' },
  ] as const;

  readonly operationTypeOptions = [
    { value: ItemAccountingOperationType.Purchase, labelKey: 'itemAccountingPolicies.operation.purchase' },
    { value: ItemAccountingOperationType.Sale, labelKey: 'itemAccountingPolicies.operation.sale' },
    {
      value: ItemAccountingOperationType.StockIssue,
      labelKey: 'itemAccountingPolicies.operation.stockIssue',
    },
    {
      value: ItemAccountingOperationType.StockReceiving,
      labelKey: 'itemAccountingPolicies.operation.stockReceiving',
    },
    {
      value: ItemAccountingOperationType.Adjustment,
      labelKey: 'itemAccountingPolicies.operation.adjustment',
    },
    {
      value: ItemAccountingOperationType.Transfer,
      labelKey: 'itemAccountingPolicies.operation.transfer',
    },
  ] as const;

  leafAccounts = computed(() => {
    const active = this.accounts().filter((account) => !account.accStopped);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  form = new FormGroup({
    policyCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    policyName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    itemType: new FormControl<number | null>(ItemAccountingItemType.Inventory, {
      validators: [Validators.required],
    }),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ruleForm = new FormGroup({
    operationType: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    debitAccountId: new FormControl<number | null>(null),
    creditAccountId: new FormControl<number | null>(null),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }

    this.accountsService.getAll().subscribe({
      next: (accounts) =>
        this.accounts.set([...accounts].sort((a, b) => a.accCode - b.accCode)),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.policyId.set(id);
    this.form.controls.policyCode.disable();
    this.loadPolicy(id);
  }

  loadPolicy(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.policiesService.getById(id).subscribe({
      next: (policy) => {
        this.form.patchValue({
          policyCode: policy.policyCode ?? '',
          policyName: policy.policyName ?? '',
          itemType: policy.itemType ?? ItemAccountingItemType.Inventory,
          notes: policy.notes ?? '',
          isActive: policy.isActive ?? true,
        });
        this.rules.set(policy.rules ?? []);
        this.loading.set(false);
        this.loadRules(id);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('itemAccountingPolicies.notFound')),
        );
      },
    });
  }

  loadRules(policyId: number): void {
    this.policiesService.getRules(policyId).subscribe({
      next: (rules) => this.rules.set(rules),
      error: () => {
        // Keep rules from getById if dedicated endpoint fails
      },
    });
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  operationTypeLabel(operationType: number): string {
    const option = this.operationTypeOptions.find((item) => item.value === operationType);
    return option ? this.t(option.labelKey) : String(operationType);
  }

  ruleAccountLabel(name?: string | null, id?: number | null): string {
    if (name) {
      return name;
    }
    if (id == null) {
      return '—';
    }
    const account = this.accounts().find((item) => item.accId === id);
    return account ? this.accountLabel(account) : String(id);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const raw = this.form.getRawValue();

    if (this.isEditMode()) {
      const id = this.policyId();
      if (!id) {
        return;
      }

      const payload: UpdateItemAccountingPolicyRequest = {
        policyName: raw.policyName.trim(),
        itemType: Number(raw.itemType),
        isActive: raw.isActive,
        notes: raw.notes.trim() || null,
      };

      this.policiesService.update(id, payload).subscribe({
        next: () => this.navigateBack('itemAccountingPolicies.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateItemAccountingPolicyRequest = {
      policyCode: raw.policyCode.trim(),
      policyName: raw.policyName.trim(),
      itemType: Number(raw.itemType),
      isActive: raw.isActive,
      notes: raw.notes.trim() || null,
    };

    this.policiesService.create(payload).subscribe({
      next: (created) => {
        this.saving.set(false);
        void this.router.navigate(
          ['/demo1/accounting/item-accounting-policies', created.policyId, 'edit'],
          { state: { successMessage: this.t('itemAccountingPolicies.createSuccess') } },
        );
      },
      error: (error) => this.handleSaveError(error),
    });
  }

  addRule(): void {
    const policyId = this.policyId();
    if (!policyId) {
      return;
    }

    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      return;
    }

    this.addingRule.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const raw = this.ruleForm.getRawValue();
    const payload: CreateItemAccountingPolicyRuleRequest = {
      operationType: Number(raw.operationType),
      debitAccountId: raw.debitAccountId,
      creditAccountId: raw.creditAccountId,
      isActive: raw.isActive,
      notes: raw.notes.trim() || null,
    };

    this.policiesService.createRule(policyId, payload).subscribe({
      next: (rule) => {
        this.rules.update((list) => [...list, rule]);
        this.ruleForm.reset({
          operationType: null,
          debitAccountId: null,
          creditAccountId: null,
          notes: '',
          isActive: true,
        });
        this.addingRule.set(false);
        this.successMessage.set(this.t('itemAccountingPolicies.ruleCreateSuccess'));
      },
      error: (error) => {
        this.addingRule.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('itemAccountingPolicies.ruleSaveError')),
        );
      },
    });
  }

  deleteRule(rule: ItemAccountingPolicyRule): void {
    if (!confirm(this.t('itemAccountingPolicies.rules.deleteConfirm'))) {
      return;
    }

    this.deletingRuleId.set(rule.ruleId);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.policiesService.deleteRule(rule.ruleId).subscribe({
      next: () => {
        this.rules.update((list) => list.filter((item) => item.ruleId !== rule.ruleId));
        this.deletingRuleId.set(null);
        this.successMessage.set(this.t('itemAccountingPolicies.ruleDeleteSuccess'));
      },
      error: (error) => {
        this.deletingRuleId.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('itemAccountingPolicies.ruleDeleteError')),
        );
      },
    });
  }

  private t(key: string): string {
    return this.language.translate(key as TranslationKey);
  }

  private navigateBack(messageKey: string): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/item-accounting-policies'], {
      state: { successMessage: this.t(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.t('itemAccountingPolicies.saveError')),
    );
  }
}
