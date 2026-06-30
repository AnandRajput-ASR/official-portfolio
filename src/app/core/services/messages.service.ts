import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse, MessagesResponse } from '@core/models';
import { AuditLogService } from '@core/services/audit-log.service';
import { environment } from '@env/environment';
import { Observable, tap } from 'rxjs';

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private http = inject(HttpClient);
  private audit = inject(AuditLogService);

  private base = `${environment.api.baseUrl}/messages`;

  // Public — submit contact form
  sendMessage(payload: ContactPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, payload);
  }

  // Admin — get all messages
  getMessages(): Observable<MessagesResponse> {
    return this.http.get<MessagesResponse>(this.base);
  }

  // Admin — mark one as read
  markRead(id: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/${id}/read`, {})
      .pipe(tap(() => this.audit.log('messages', 'save', 'Marked message as read')));
  }

  // Admin — toggle star
  toggleStar(id: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/${id}/star`, {})
      .pipe(tap(() => this.audit.log('messages', 'save', 'Toggled message star')));
  }

  // Admin — delete
  deleteMessage(id: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/${id}`)
      .pipe(tap(() => this.audit.log('messages', 'delete', 'Deleted message')));
  }

  // Admin — mark all read
  markAllRead(): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/mark-all-read`, {})
      .pipe(tap(() => this.audit.log('messages', 'save', 'Marked all messages as read')));
  }

  updateLabels(id: string, labels: string[]): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/${id}/labels`, { labels })
      .pipe(tap(() => this.audit.log('messages', 'save', 'Updated message labels')));
  }

  setArchived(id: string, archived: boolean): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/${id}/archive`, { archived })
      .pipe(tap(() => this.audit.log('messages', 'save', archived ? 'Archived message' : 'Moved message to inbox')));
  }

  markReplied(id: string, repliedAt: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/${id}/replied`, { repliedAt })
      .pipe(tap(() => this.audit.log('messages', 'save', 'Marked message as replied')));
  }
}
