import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl, toApiPath } from '../api-url';
import { ApiResponse } from '../models/api-response.model';

/** Generated from Swagger tag: WeatherForecast */
@Injectable({ providedIn: 'root' })
export class WeatherForecastApiService {
  private http = inject(HttpClient);

  getWeatherForecast() {
    return this.http.get<ApiResponse<unknown>>(buildApiUrl('/WeatherForecast'));
  }
}
