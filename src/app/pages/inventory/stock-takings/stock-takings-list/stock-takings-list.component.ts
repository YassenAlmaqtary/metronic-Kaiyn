import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StockTakingListItem, StockTakingStatus, isTakingDraft } from '../../../../core/api/models/stock-taking.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { StockTakingsService } from '../../../../core/services/stock-takings.service';
@Component({selector:'app-stock-takings-list',imports:[FormsModule,RouterLink,TranslatePipe,DatePipe],templateUrl:'./stock-takings-list.component.html',styleUrl:'./stock-takings-list.component.scss'})
export class StockTakingsListComponent implements OnInit {
 private service=inject(StockTakingsService); private language=inject(LanguageService); items=signal<StockTakingListItem[]>([]); loading=signal(false); actionLoading=signal<number|null>(null); errorMessage=signal(''); successMessage=signal(''); searchTerm=signal(''); draftsOnly=signal(false);
 filtered=computed(()=>{const t=this.searchTerm().toLowerCase();return this.items().filter(x=>(!this.draftsOnly()||isTakingDraft(x.statusId))&&(!t||[x.takingNo,x.storeName,x.responsibleUserName].some(v=>String(v??'').toLowerCase().includes(t))));});
 ngOnInit(){this.load();} load(){this.loading.set(true);(this.draftsOnly()?this.service.getDrafts():this.service.getAll()).subscribe({next:x=>{this.items.set(x);this.loading.set(false)},error:e=>{this.loading.set(false);this.errorMessage.set(extractApiErrorMessage(e,this.language.translate('stockTakings.loadError')))}})}
 setFilter(v:boolean){this.draftsOnly.set(v);this.load()} post(x:StockTakingListItem){this.run(x.takingId,()=>this.service.post(x.takingId),'stockTakings.postSuccess')} cancel(x:StockTakingListItem){if(confirm(this.language.translate('stockTakings.cancelConfirm')))this.run(x.takingId,()=>this.service.cancel(x.takingId),'stockTakings.cancelSuccess')}
 private run(id:number,fn:()=>ReturnType<StockTakingsService['post']>,key:string){this.actionLoading.set(id);fn().subscribe({next:()=>{this.actionLoading.set(null);this.successMessage.set(this.language.translate(key));this.load()},error:e=>{this.actionLoading.set(null);this.errorMessage.set(extractApiErrorMessage(e,this.language.translate('stockTakings.actionError')))}})} isDraft=isTakingDraft; status=StockTakingStatus;
}
