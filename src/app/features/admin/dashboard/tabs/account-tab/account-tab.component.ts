import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-account-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-tab.component.html',
  styleUrl: './account-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTabComponent {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  accountForm = { currentPassword: '', newPassword: '', confirmPassword: '', newUsername: '' };
  accountSaving = false;
  forgotTokenResult: string | null = null;
  resetForm = { token: '', newPassword: '', confirm: '' };
  showResetForm = false;

  changeCredentials(): void {
    if (!this.accountForm.currentPassword || !this.accountForm.newPassword) {
      this.toast.error('Current and new password are required');
      return;
    }
    if (this.accountForm.newPassword !== this.accountForm.confirmPassword) {
      this.toast.error('New passwords do not match');
      return;
    }
    if (this.accountForm.newPassword.length < 8) {
      this.toast.error('Password must be at least 8 characters');
      return;
    }
    this.accountSaving = true;
    this.auth
      .changePassword(
        this.accountForm.currentPassword,
        this.accountForm.newPassword,
        this.accountForm.newUsername || undefined,
      )
      .subscribe({
        next: () => {
          this.accountSaving = false;
          this.accountForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            newUsername: '',
          };
          this.toast.success('Credentials updated! Please log in again.');
          setTimeout(() => this.auth.logout(), 2000);
        },
        error: (err) => {
          this.accountSaving = false;
          this.toast.error(err.error?.message || 'Update failed');
        },
      });
  }

  sendForgotPassword(): void {
    this.auth.forgotPassword().subscribe({
      next: (res) => {
        if (res.emailSent) {
          this.toast.info('Reset link sent to ' + res.email);
        } else {
          this.forgotTokenResult = res.resetToken ?? null;
          this.showResetForm = true;
          this.toast.warning('Email not configured — token shown below for manual reset');
        }
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to generate reset token'),
    });
  }

  resetPasswordWithToken(): void {
    if (this.resetForm.newPassword !== this.resetForm.confirm) {
      this.toast.error('Passwords do not match');
      return;
    }
    this.auth.resetPassword(this.resetForm.token, this.resetForm.newPassword).subscribe({
      next: () => {
        this.toast.success('Password reset! Please log in.');
        this.resetForm = { token: '', newPassword: '', confirm: '' };
        this.showResetForm = false;
        setTimeout(() => this.auth.logout(), 1500);
      },
      error: (err) => this.toast.error(err.error?.message || 'Reset failed'),
    });
  }

  hasSpecialChars(str: string): boolean {
    return /[^a-zA-Z0-9]/.test(str);
  }
}
