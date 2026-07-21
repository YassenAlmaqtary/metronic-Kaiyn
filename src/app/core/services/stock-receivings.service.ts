import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import {
  AvailableQtyResult,
  ItemUnitLookup,
  NextVoucherNumber,
  ProductBarcodeResult,
} from '../api/models/stock-shared.models';
import {
  SaveStockReceivingRequest,
  StockReceivingHeader,
  StockReceivingListItem,
  StockReceivingType,
} from '../api/models/stock-receiving.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class StockReceivingsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/StockReceiving';
  private readonly typesPath = '/api/StockReceivingTypes';

  getAll(): Observable<StockReceivingListItem[]> {
    return this.http
      .get<ApiResponse<StockReceivingListItem[]>>(buildApiUrl(this.basePath))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getPending(): Observable<StockReceivingListItem[]> {
    return this.http
      .get<ApiResponse<StockReceivingListItem[]>>(buildApiUrl(`${this.basePath}/pending`))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getById(id: number): Observable<StockReceivingHeader> {
    return this.http
      .get<ApiResponse<StockReceivingHeader>>(
        buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getNextNumber(branchId?: number): Observable<NextVoucherNumber> {
    let params = new HttpParams();
    if (branchId != null) params = params.set('branchId', String(branchId));
    return this.http
      .get<ApiResponse<NextVoucherNumber>>(buildApiUrl(`${this.basePath}/next-number`), { params })
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  save(request: SaveStockReceivingRequest): Observable<StockReceivingHeader> {
    return this.http
      .post<ApiResponse<StockReceivingHeader>>(buildApiUrl(this.basePath), request)
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  post(id: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}/post`, { id })), {})
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(buildApiUrl(toApiPath(`${this.basePath}/{id}`, { id })))
      .pipe(
        map((r) => unwrapApiResponse(r)),
        map(() => undefined),
      );
  }

  lookupBarcode(barcode: string): Observable<ProductBarcodeResult> {
    return this.http
      .get<ApiResponse<ProductBarcodeResult>>(
        buildApiUrl(toApiPath(`${this.basePath}/barcode/{barcode}`, { barcode })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getItemUnits(itemId: number): Observable<ItemUnitLookup[]> {
    return this.http
      .get<ApiResponse<ItemUnitLookup[]>>(
        buildApiUrl(toApiPath(`${this.basePath}/item-units/{itemId}`, { itemId })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getAvailableQty(params: {
    itemId: number;
    storeId: number;
    branchId: number;
    unitId?: number;
  }): Observable<AvailableQtyResult> {
    let httpParams = new HttpParams()
      .set('itemId', String(params.itemId))
      .set('storeId', String(params.storeId))
      .set('branchId', String(params.branchId));
    if (params.unitId != null) httpParams = httpParams.set('unitId', String(params.unitId));

    return this.http
      .get<ApiResponse<AvailableQtyResult>>(buildApiUrl(`${this.basePath}/available-qty`), {
        params: httpParams,
      })
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getTypes(): Observable<StockReceivingType[]> {
    return this.http
      .get<ApiResponse<StockReceivingType[]>>(buildApiUrl(this.typesPath))
      .pipe(map((r) => unwrapApiResponse(r)));
  }

  getExchangeRate(
    currencyId: number,
  ): Observable<{ currencyId?: number; currencyName?: string | null; exchangeRate: number }> {
    return this.http
      .get<ApiResponse<{ currencyId?: number; currencyName?: string | null; exchangeRate: number }>>(
        buildApiUrl(toApiPath(`${this.basePath}/exchange-rate/{currencyId}`, { currencyId })),
      )
      .pipe(map((r) => unwrapApiResponse(r)));
  }
}
