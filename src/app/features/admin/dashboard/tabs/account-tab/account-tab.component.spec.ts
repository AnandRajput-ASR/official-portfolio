import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { of, throwError } from 'rxjs';
import { AccountTabComponent } from './account-tab.component';

describe('AccountTabComponent', () => {
  let component: AccountTabComponent;
  let fixture: ComponentFixture<AccountTabComponent>;
  let authStub: {
    getUsername: jasmine.Spy;
    logout: jasmine.Spy;
    changePassword: jasmine.Spy;
    forgotPassword: jasmine.Spy;
    resetPassword: jasmine.Spy;
  };
  let toastStub: Record<string, jasmine.Spy>;

  beforeEach(async () => {
    authStub = {
      getUsername: jasmine.createSpy('getUsername').and.returnValue('admin'),
      logout: jasmine.createSpy('logout'),
      changePassword: jasmine.createSpy('changePassword').and.returnValue(of({})),
      forgotPassword: jasmine.createSpy('forgotPassword').and.returnValue(of({ emailSent: true })),
      resetPassword: jasmine.createSpy('resetPassword').and.returnValue(of({})),
    };
    toastStub = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info'),
      warning: jasmine.createSpy('warning'),
    };

    await TestBed.configureTestingModule({
      imports: [AccountTabComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: ToastService, useValue: toastStub },
      ],
    })
      .overrideComponent(AccountTabComponent, { set: { template: '<div></div>', styles: [] } })
      .compileComponents();

    fixture = TestBed.createComponent(AccountTabComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('detects special characters', () => {
    expect(component.hasSpecialChars('abc123')).toBe(false);
    expect(component.hasSpecialChars('abc!23')).toBe(true);
  });

  it('rejects credential change when required fields are missing', () => {
    component.accountForm.currentPassword = '';
    component.changeCredentials();
    expect(toastStub['error']).toHaveBeenCalled();
    expect(authStub.changePassword).not.toHaveBeenCalled();
  });

  it('rejects credential change when passwords do not match', () => {
    component.accountForm = {
      currentPassword: 'old',
      newPassword: 'password1',
      confirmPassword: 'password2',
      newUsername: '',
    };
    component.changeCredentials();
    expect(toastStub['error']).toHaveBeenCalledWith('New passwords do not match');
    expect(authStub.changePassword).not.toHaveBeenCalled();
  });

  it('rejects credential change when new password is too short', () => {
    component.accountForm = {
      currentPassword: 'old',
      newPassword: 'short',
      confirmPassword: 'short',
      newUsername: '',
    };
    component.changeCredentials();
    expect(toastStub['error']).toHaveBeenCalledWith('Password must be at least 8 characters');
    expect(authStub.changePassword).not.toHaveBeenCalled();
  });

  it('changes credentials with valid input', () => {
    component.accountForm = {
      currentPassword: 'old',
      newPassword: 'newpassword',
      confirmPassword: 'newpassword',
      newUsername: 'newadmin',
    };
    component.changeCredentials();
    expect(authStub.changePassword).toHaveBeenCalledWith('old', 'newpassword', 'newadmin');
    expect(component.accountForm.currentPassword).toBe('');
    expect(toastStub['success']).toHaveBeenCalled();
  });

  it('shows token when email is not configured on forgot password', () => {
    authStub.forgotPassword.and.returnValue(of({ emailSent: false, resetToken: 'abc123' }));
    component.sendForgotPassword();
    expect(component.forgotTokenResult).toBe('abc123');
    expect(component.showResetForm).toBe(true);
  });

  it('rejects reset when passwords do not match', () => {
    component.resetForm = { token: 't', newPassword: 'a', confirm: 'b' };
    component.resetPasswordWithToken();
    expect(toastStub['error']).toHaveBeenCalledWith('Passwords do not match');
    expect(authStub.resetPassword).not.toHaveBeenCalled();
  });

  it('resets password with matching token input', () => {
    component.resetForm = { token: 'tok', newPassword: 'pass1234', confirm: 'pass1234' };
    component.resetPasswordWithToken();
    expect(authStub.resetPassword).toHaveBeenCalledWith('tok', 'pass1234');
    expect(component.showResetForm).toBe(false);
  });

  it('surfaces an error toast when credential change fails', () => {
    authStub.changePassword.and.returnValue(
      throwError(() => ({ error: { message: 'boom' } })),
    );
    component.accountForm = {
      currentPassword: 'old',
      newPassword: 'newpassword',
      confirmPassword: 'newpassword',
      newUsername: '',
    };
    component.changeCredentials();
    expect(toastStub['error']).toHaveBeenCalledWith('boom');
    expect(component.accountSaving).toBe(false);
  });
});
