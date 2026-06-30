import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { of } from 'rxjs';
import { AnalyticsTabComponent } from './analytics-tab.component';

describe('AnalyticsTabComponent', () => {
  let component: AnalyticsTabComponent;
  let fixture: ComponentFixture<AnalyticsTabComponent>;
  let adminStub: { getAnalytics: jasmine.Spy; resetAnalytics: jasmine.Spy };

  beforeEach(async () => {
    adminStub = {
      getAnalytics: jasmine.createSpy('getAnalytics').and.returnValue(of({ data: null })),
      resetAnalytics: jasmine.createSpy('resetAnalytics').and.returnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [AnalyticsTabComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminService, useValue: adminStub },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(false) } },
      ],
    })
      .overrideComponent(AnalyticsTabComponent, { set: { template: '<div></div>', styles: [] } })
      .compileComponents();

    fixture = TestBed.createComponent(AnalyticsTabComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('computes contact conversion rate', () => {
    component.analytics = { contactFormViews: 100, contactFormSubmissions: 25 } as never;
    expect(component.conversionRate()).toBe('25.0%');
    component.analytics = { contactFormViews: 0, contactFormSubmissions: 0 } as never;
    expect(component.conversionRate()).toBe('—');
  });

  it('builds a 30-day zero-filled visit chart', () => {
    component.analytics = { dailyVisits: [] } as never;
    const bars = component.visitChartBars();
    expect(bars.length).toBe(30);
    expect(component.visitChartMax()).toBe(1);
  });

  it('summarises month-over-month delta', () => {
    component.analytics = { thisMonth: 120, lastMonth: 100 } as never;
    expect(component.monthDelta()).toContain('+20');
    component.analytics = { thisMonth: 0, lastMonth: 0 } as never;
    expect(component.monthDelta()).toBe('—');
  });

  it('ranks the top project clicks', () => {
    component.analytics = { projectClicks: { a: 3, b: 10, c: 1 } } as never;
    const top = component.topProjectClicks();
    expect(top.map((p) => p.name)).toEqual(['b', 'a', 'c']);
    expect(top[0].clicks).toBe(10);
  });

  it('loads analytics on init', () => {
    adminStub.getAnalytics.and.returnValue(of({ data: { pageViews: 5 } }));
    component.ngOnInit();
    expect(adminStub.getAnalytics).toHaveBeenCalled();
    expect(component.analytics).toEqual({ pageViews: 5 } as never);
    expect(component.analyticsLoading).toBeFalse();
  });
});
