import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { buildApiUrl } from '../api/api-url';
import { ApiResponse } from '../api/models/api-response.model';
import { PartnerTypeLookup } from '../api/models/opening-balance.models';
import { unwrapApiResponse } from '../api/utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class LookupsService {
  private http = inject(HttpClient);
  private readonly basePath = '/api/Lookups';

  getPartnerTypes(): Observable<PartnerTypeLookup[]> {
    return this.http
      .get<ApiResponse<PartnerTypeLookup[]>>(buildApiUrl(`${this.basePath}/partner-types`))
      .pipe(map((response) => unwrapApiResponse(response)));
  }
}
