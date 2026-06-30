import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ADMIN_LOGIN_ENTRY_KEY } from '@core/guards/secret-slug.guard';
import { AuthService } from '@core/services/auth.service';
import { StorageService } from '@core/services/storage.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private storage = inject(StorageService);

  username = '';
  password = '';
  error = '';
  loading = false;

  constructor() {
    if (this.auth.isLoggedInSnapshot()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  login(): void {
    if (!this.username || !this.password) {
      this.error = 'Please enter username and password';
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.storage.removeSession(ADMIN_LOGIN_ENTRY_KEY);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Invalid credentials';
      },
    });
  }
}
