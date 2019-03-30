import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FdaDrugService {

  constructor(private http: HttpClient) { }

  loadDrugs(url = null, options?): Observable<any> {
    return this.http.get(url || environment.api, options);
  }
}
