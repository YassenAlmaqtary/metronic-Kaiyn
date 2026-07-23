import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductLookup } from '../../../../core/api/models/product.models';
import { StockTakingDetail, StockTakingStatus, StoreItemForTaking, SaveStockTakingRequest } from '../../../../core/api/models/stock-taking.models';
import { Store } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductsService } from '../../../../core/services/products.service';
import { StockTakingsService } from '../../../../core/services/stock-takings.service';
import { StoresService } from '../../../../core/services/stores.service';
@Component({selector:'app-stock-taking-form',imports:[ReactiveFormsModule,RouterLink,TranslatePipe],templateUrl:'./stock-taking-form.component.html',styleUrl:'./stock-taking-form.component.scss'})
export class StockTakingFormComponent implements OnInit {
 private route=inject(ActivatedRoute);private router=inject(Router);private service=inject(StockTakingsService);private storesService=inject(StoresService);private productsService=inject(ProductsService);private language=inject(LanguageService);
 id=signal<number|null>(null);loading=signal(false);loadingItems=signal(false);saving=signal(false);errorMessage=signal('');infoMessage=signal('');takingNo=signal('');readOnly=signal(false);stores=signal<Store[]>([]);products=signal<ProductLookup[]>([]);
 form=new FormGroup({storeId:new FormControl<number|null>(null,Validators.required),takingDate:new FormControl(new Date().toISOString().slice(0,10),{nonNullable:true,validators:Validators.required}),takingType:new FormControl(1,{nonNullable:true}),responsibleUserId:new FormControl<number|null>(null),notes:new FormControl('',{nonNullable:true}),details:new FormArray<FormGroup>([])});
 get details(){return this.form.controls.details}
 ngOnInit(){this.storesService.getAll().subscribe({next:x=>this.stores.set(x??[])});this.productsService.getAll().subscribe({next:x=>this.products.set(x??[])});const id=Number(this.route.snapshot.paramMap.get('id'));if(id){this.id.set(id);this.load(id)}}
 load(id:number){this.loading.set(true);this.service.getById(id).subscribe({next:x=>{this.takingNo.set(x.takingNo??'');this.form.patchValue({storeId:x.storeId,takingDate:this.date(x.takingDate),takingType:x.takingType??1,responsibleUserId:x.responsibleUserId??null,notes:x.notes??''});this.details.clear();(x.details??[]).forEach(d=>this.addLine(d));this.readOnly.set(x.statusId===StockTakingStatus.Posted||x.statusId===StockTakingStatus.Cancelled);if(this.readOnly())this.form.disable();this.loading.set(false)},error:e=>{this.loading.set(false);this.errorMessage.set(extractApiErrorMessage(e,this.language.translate('stockTakings.notFound')))}})}
 loadStoreItems(){
  const storeId=Number(this.form.controls.storeId.value);
  if(!storeId){this.errorMessage.set(this.language.translate('stockTakings.selectStoreFirst'));return;}
  this.errorMessage.set('');this.infoMessage.set('');this.loadingItems.set(true);
  this.service.getStoreItems(storeId).subscribe({
   next:(raw)=>{
    try{
     const items=this.normalizeStoreItems(raw);
     this.details.clear();
     items.forEach(y=>this.addStoreLine(y));
     if(!items.length){this.errorMessage.set(this.language.translate('stockTakings.emptyStoreItems'));}
     else{this.infoMessage.set(this.language.translate('stockTakings.loadItemsSuccess').replace('{count}',String(items.length)));}
    }catch(err){
     this.errorMessage.set(extractApiErrorMessage(err,this.language.translate('stockTakings.loadItemsError')));
    }finally{this.loadingItems.set(false);}
   },
   error:e=>{this.loadingItems.set(false);this.errorMessage.set(extractApiErrorMessage(e,this.language.translate('stockTakings.loadItemsError')));},
   complete:()=>{if(this.loadingItems()){this.loadingItems.set(false);this.errorMessage.set(this.language.translate('stockTakings.loadItemsError'));}},
  });
 }
 addStoreLine(x:StoreItemForTaking){
  const row=x as StoreItemForTaking & Record<string,unknown>;
  const itemId=Number(row.itemId??row['ItemId']);
  const unitId=Number(row.unitId??row['UnitId']);
  const systemQty=Number(row.systemQty??row['SystemQty']??0);
  this.addLine({
   itemId:Number.isFinite(itemId)?itemId:undefined,
   itemName:String(row.itemName??row['ItemName']??''),
   unitId:Number.isFinite(unitId)?unitId:undefined,
   unitName:String(row.unitName??row['UnitName']??''),
   batchNumber:String(row.batchNumber??row['BatchNumber']??''),
   expiryDate:(row.expiryDate??row['ExpiryDate']) as string|null|undefined,
   systemQty,
   countedQty:systemQty,
   averageCost:Number(row.averageCost??row['AverageCost']??0),
  });
 }
 addLine(x?:Partial<StockTakingDetail>){const g=new FormGroup({itemId:new FormControl(x?.itemId??null,Validators.required),itemName:new FormControl(x?.itemName??'',{nonNullable:true}),unitId:new FormControl(x?.unitId??null,Validators.required),unitName:new FormControl(x?.unitName??'',{nonNullable:true}),systemQty:new FormControl(Number(x?.systemQty??0),{nonNullable:true}),countedQty:new FormControl(Number(x?.countedQty??0),{nonNullable:true}),differenceQty:new FormControl(Number(x?.differenceQty??0),{nonNullable:true}),averageCost:new FormControl(Number(x?.averageCost??0),{nonNullable:true}),differenceValue:new FormControl(Number(x?.differenceValue??0),{nonNullable:true}),batchNumber:new FormControl(x?.batchNumber??'',{nonNullable:true}),expiryDate:new FormControl(this.date(x?.expiryDate),{nonNullable:true}),notes:new FormControl(x?.notes??'',{nonNullable:true})});this.details.push(g);this.recalc(this.details.length-1)}
 productLabel(itemId:number|null,fallback:string){if(itemId==null)return fallback;const p=this.products().find(x=>x.productId===itemId);return p?.productName||fallback||String(itemId)}
 hasProduct(itemId:number|null){return itemId!=null&&this.products().some(x=>x.productId===itemId)}
 recalc(i:number){const g=this.details.at(i),d=Number(g.controls['countedQty'].value)-Number(g.controls['systemQty'].value);g.controls['differenceQty'].setValue(d,{emitEvent:false});g.controls['differenceValue'].setValue(d*Number(g.controls['averageCost'].value),{emitEvent:false})} removeLine(i:number){this.details.removeAt(i)}
 save(){if(this.form.invalid||!this.details.length){this.form.markAllAsTouched();this.errorMessage.set(this.language.translate(!this.details.length?'stockTakings.emptyLines':'stockTakings.saveError'));return}this.saving.set(true);this.errorMessage.set('');const v=this.form.getRawValue();const payload:SaveStockTakingRequest={takingId:this.id()??undefined,storeId:Number(v.storeId),takingDate:v.takingDate,takingType:v.takingType,responsibleUserId:v.responsibleUserId,notes:v.notes||null,details:this.details.controls.map(ctrl=>({itemId:Number(ctrl.controls['itemId'].value),unitId:Number(ctrl.controls['unitId'].value),batchNumber:String(ctrl.controls['batchNumber'].value||'')||null,expiryDate:String(ctrl.controls['expiryDate'].value||'')||null,systemQty:Number(ctrl.controls['systemQty'].value),countedQty:Number(ctrl.controls['countedQty'].value),differenceQty:Number(ctrl.controls['differenceQty'].value),averageCost:Number(ctrl.controls['averageCost'].value),differenceValue:Number(ctrl.controls['differenceValue'].value),notes:String(ctrl.controls['notes'].value||'')||null}))};this.service.save(payload).subscribe({next:()=>void this.router.navigate(['/demo1/inventory/stock-takings'],{state:{successMessage:this.language.translate('stockTakings.saveSuccess')}}),error:e=>{this.saving.set(false);this.errorMessage.set(extractApiErrorMessage(e,this.language.translate('stockTakings.saveError')))}})}
 private normalizeStoreItems(raw:unknown):StoreItemForTaking[]{
  if(Array.isArray(raw))return raw as StoreItemForTaking[];
  if(raw&&typeof raw==='object'){
   const o=raw as Record<string,unknown>;
   if(Array.isArray(o['$values']))return o['$values'] as StoreItemForTaking[];
   if(Array.isArray(o['items']))return o['items'] as StoreItemForTaking[];
   if(Array.isArray(o['data']))return o['data'] as StoreItemForTaking[];
  }
  return [];
 }
 private date(x?:string|null){return x?String(x).slice(0,10):''}
}
