import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { DATA_REPO, IDataRepo } from './data-repo';
import { Router } from "@angular/router";

@Injectable({ providedIn: 'root' })
export class ApiRepo implements Partial<IDataRepo> {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // ========= Reads =========
  get(id: string): any {
    // لو لسه مش موحّدين الأنواع، هنرجّع any مؤقتاً
    return this.http.get<any>(`${this.base}/requests/${encodeURIComponent(id)}`);
  }

  list(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/requests`);
  }

  // ========= NEW: Golden Records Methods =========
  getGoldenRecords(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/requests?isGolden=true`);
  }

  getRequestsByFilter(filters: {
    status?: string;
    origin?: string;
    isGolden?: boolean;
    assignedTo?: string;
  }): Observable<any[]> {
    const params = new URLSearchParams();
    
    if (filters.status) params.set('status', filters.status);
    if (filters.origin) params.set('origin', filters.origin);
    if (filters.isGolden !== undefined) params.set('isGolden', filters.isGolden.toString());
    if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
    
    const queryString = params.toString();
    const url = queryString ? `${this.base}/requests?${queryString}` : `${this.base}/requests`;
    
    return this.http.get<any[]>(url);
  }

  // ========= Data Entry =========
  dataEntryCreateAndSubmit(payload: any, note?: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/requests`, { ...payload, note });
  }

  dataEntryFixAndResubmit(id: string, payload: any, note?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/requests/${encodeURIComponent(id)}/resubmit`, { ...payload, note });
  }

  // ========= Master =========
  masterApprove(id: string, note?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/requests/${encodeURIComponent(id)}/approve`, { note });
  }

  masterReject(id: string, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/requests/${encodeURIComponent(id)}/reject`, { reason });
  }

  // ========= Compliance =========
  complianceApprove(id: string, note?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/requests/${encodeURIComponent(id)}/compliance/approve`, { note });
  }

  complianceBlock(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.base}/requests/${encodeURIComponent(id)}/compliance/block`, { reason });
  }
}