import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ContentService } from '@core/services/content.service';
import { AppComponent } from './app.component';

@Component({ standalone: true, template: '<p>dummy</p>' })
class DummyComponent {}

describe('AppComponent', () => {
  const contentServiceStub = {
    trackEvent: jasmine.createSpy('trackEvent'),
  };

  beforeEach(async () => {
    contentServiceStub.trackEvent.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'blog', component: DummyComponent },
          { path: 'admin/dashboard', component: DummyComponent },
          { path: 'playground', component: DummyComponent },
        ]),
        { provide: ContentService, useValue: contentServiceStub },
      ],
    }).compileComponents();
  });

  it('should create the app when initialized', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render app shell when component is created', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-global-loader')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should track page view when navigating to a public route', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);

    fixture.detectChanges();
    contentServiceStub.trackEvent.calls.reset();

    void router.navigateByUrl('/blog');
    tick();

    expect(contentServiceStub.trackEvent).toHaveBeenCalledWith(
      'pageView',
      jasmine.objectContaining({ path: '/blog' }),
    );
  }));

  it('should not track page view when navigating to an admin route', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);

    fixture.detectChanges();
    contentServiceStub.trackEvent.calls.reset();

    void router.navigateByUrl('/admin/dashboard');
    tick();

    expect(contentServiceStub.trackEvent).not.toHaveBeenCalled();
  }));

  it('should not track page view when navigating to a playground route', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);

    fixture.detectChanges();
    contentServiceStub.trackEvent.calls.reset();

    void router.navigateByUrl('/playground');
    tick();

    expect(contentServiceStub.trackEvent).not.toHaveBeenCalled();
  }));
});
