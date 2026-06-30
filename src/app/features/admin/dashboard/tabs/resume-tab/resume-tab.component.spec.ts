import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '@core/services/auth.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ResumeStateService } from '@core/services/resume-state.service';
import { ResumeService } from '@core/services/resume.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { of, throwError } from 'rxjs';
import { ResumeTabComponent } from './resume-tab.component';

describe('ResumeTabComponent', () => {
  let component: ResumeTabComponent;
  let fixture: ComponentFixture<ResumeTabComponent>;
  let resumeStub: {
    getDownloadUrl: jasmine.Spy;
    formatSize: jasmine.Spy;
    uploadResumeWithProgress: jasmine.Spy;
    deleteResume: jasmine.Spy;
    updateDownloadName: jasmine.Spy;
  };
  let stateStub: { info: ReturnType<typeof signal>; load: jasmine.Spy; set: jasmine.Spy };
  let toastStub: Record<string, jasmine.Spy>;
  let confirmStub: { ask: jasmine.Spy };

  beforeEach(async () => {
    resumeStub = {
      getDownloadUrl: jasmine.createSpy('getDownloadUrl').and.returnValue('/dl'),
      formatSize: jasmine.createSpy('formatSize').and.returnValue('1 KB'),
      uploadResumeWithProgress: jasmine
        .createSpy('uploadResumeWithProgress')
        .and.returnValue(of({ type: 'complete' })),
      deleteResume: jasmine.createSpy('deleteResume').and.returnValue(of({ message: 'ok' })),
      updateDownloadName: jasmine.createSpy('updateDownloadName').and.returnValue(of({})),
    };
    stateStub = {
      info: signal(null),
      load: jasmine.createSpy('load'),
      set: jasmine.createSpy('set'),
    };
    toastStub = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      info: jasmine.createSpy('info'),
      warning: jasmine.createSpy('warning'),
    };
    confirmStub = { ask: jasmine.createSpy('ask').and.returnValue(Promise.resolve(true)) };

    await TestBed.configureTestingModule({
      imports: [ResumeTabComponent],
      providers: [
        { provide: ResumeService, useValue: resumeStub },
        { provide: ResumeStateService, useValue: stateStub },
        { provide: AuthService, useValue: { getToken: () => 'tok' } },
        { provide: ToastService, useValue: toastStub },
        { provide: ConfirmService, useValue: confirmStub },
      ],
    })
      .overrideComponent(ResumeTabComponent, { set: { template: '<div></div>', styles: [] } })
      .compileComponents();

    fixture = TestBed.createComponent(ResumeTabComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('rejects non-PDF files', () => {
    component.uploadResume(new File([''], 'cv.docx'));
    expect(toastStub['error']).toHaveBeenCalledWith('Only PDF files allowed.');
    expect(resumeStub.uploadResumeWithProgress).not.toHaveBeenCalled();
  });

  it('rejects files larger than 10MB', () => {
    const big = new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], 'cv.pdf');
    component.uploadResume(big);
    expect(toastStub['error']).toHaveBeenCalledWith('Max 10MB allowed.');
    expect(resumeStub.uploadResumeWithProgress).not.toHaveBeenCalled();
  });

  it('reloads shared state on a successful upload', () => {
    component.uploadResume(new File(['x'], 'cv.pdf'));
    expect(resumeStub.uploadResumeWithProgress).toHaveBeenCalled();
    expect(stateStub.load).toHaveBeenCalled();
    expect(component.uploadState).toBe('done');
  });

  it('surfaces upload errors', () => {
    resumeStub.uploadResumeWithProgress.and.returnValue(
      of({ type: 'error', error: 'server down' }),
    );
    component.uploadResume(new File(['x'], 'cv.pdf'));
    expect(component.uploadState).toBe('error');
    expect(component.uploadErrorMsg).toBe('server down');
  });

  it('deletes resume after confirmation', async () => {
    await component.deleteResume();
    expect(resumeStub.deleteResume).toHaveBeenCalled();
    expect(stateStub.set).toHaveBeenCalledWith({ available: false });
  });

  it('does not delete when confirmation is declined', async () => {
    confirmStub.ask.and.returnValue(Promise.resolve(false));
    await component.deleteResume();
    expect(resumeStub.deleteResume).not.toHaveBeenCalled();
  });

  it('saves the download name and updates shared state', () => {
    stateStub.info.set({ available: true, fileName: 'cv.pdf' });
    component.resumeDownloadName = 'AnandRajput.pdf';
    component.saveDownloadName();
    expect(resumeStub.updateDownloadName).toHaveBeenCalledWith('AnandRajput.pdf');
    expect(stateStub.set).toHaveBeenCalledWith(
      jasmine.objectContaining({ downloadName: 'AnandRajput.pdf' }),
    );
  });

  it('handles download-name save failure', () => {
    resumeStub.updateDownloadName.and.returnValue(throwError(() => new Error('x')));
    component.saveDownloadName();
    expect(component.resumeDownloadNameSaving).toBe(false);
    expect(toastStub['error']).toHaveBeenCalledWith('Save failed');
  });

  it('formats relative dates', () => {
    expect(component.formatDate('')).toBe('');
    const now = new Date().toISOString();
    expect(component.formatDate(now)).toBe('just now');
  });
});
