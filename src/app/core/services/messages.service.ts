import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiResponse, MessagesResponse } from '@core/models';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private http = inject(HttpClient);

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
    return this.http.patch<ApiResponse>(`${this.base}/${id}/read`, {});
  }

  // Admin — toggle star
  toggleStar(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.base}/${id}/star`, {});
  }

  // Admin — delete
  deleteMessage(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.base}/${id}`);
  }

  // Admin — mark all read
  markAllRead(): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.base}/mark-all-read`, {});
  }
}
