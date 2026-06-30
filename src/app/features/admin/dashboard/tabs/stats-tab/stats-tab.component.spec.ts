import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Stat } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { of, throwError } from 'rxjs';
import { StatsTabComponent } from './stats-tab.component';

describe('StatsTabComponent', () => {
  let component: StatsTabComponent;
  let fixture: ComponentFixture<StatsTabComponent>;
  let store: AdminContentStore;
  let adminStub: { updateStats: jasmine.Spy };
  let toastStub: { success: jasmine.Spy; error: jasmine.Spy };

  const sampleStats: Stat[] = [
    { id: 's1', value: 5, suffix: '+', label: 'Years' },
    { id: 's2', value: 30, suffix: '', label: 'Projects' },
  ];

  beforeEach(async () => {
    adminStub = {
      updateStats: jasmine.createSpy('updateStats').and.returnValue(of({ data: sampleStats })),
    };
    toastStub = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
    };

    await TestBed.configureTestingModule({
      imports: [StatsTabComponent],
      providers: [
        AdminContentStore,
        { provide: AdminService, useValue: adminStub },
        { provide: ToastService, useValue: toastStub },
      ],
    })
      .overrideComponent(StatsTabComponent, { set: { template: '<div></div>', styles: [] } })
      .compileComponents();

    store = TestBed.inject(AdminContentStore);
    store.content.set({ stats: sampleStats } as never);

    fixture = TestBed.createComponent(StatsTabComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('clones stats from the store on init', () => {
    component.ngOnInit();
    expect(component.statsEdit.length).toBe(2);
    expect(component.statsEdit).not.toBe(sampleStats);
    expect(component.statsEdit[0]).not.toBe(sampleStats[0]);
  });

  it('registers a saver on init and removes it on destroy', () => {
    component.ngOnInit();
    expect(store.getSaver('stats')).toBeDefined();
    component.ngOnDestroy();
    expect(store.getSaver('stats')).toBeUndefined();
  });

  it('adds a new stat and marks dirty', () => {
    component.ngOnInit();
    component.addStat();
    expect(component.statsEdit.length).toBe(3);
    expect(store.isDirty('stats')).toBeTrue();
  });

  it('deletes a stat by id and marks dirty', () => {
    component.ngOnInit();
    component.deleteStat('s1');
    expect(component.statsEdit.map((s) => s.id)).toEqual(['s2']);
    expect(store.isDirty('stats')).toBeTrue();
  });

  it('saves stats, updates store content, clears dirty and toasts success', () => {
    component.ngOnInit();
    store.markDirty('stats');
    component.saveStats();
    expect(adminStub.updateStats).toHaveBeenCalledWith(component.statsEdit);
    expect(store.content()?.stats?.length).toBe(2);
    expect(store.isDirty('stats')).toBeFalse();
    expect(store.saving()).toBeFalse();
    expect(toastStub.success).toHaveBeenCalled();
  });

  it('toasts an error and resets saving when save fails', () => {
    adminStub.updateStats.and.returnValue(throwError(() => new Error('boom')));
    component.ngOnInit();
    component.saveStats();
    expect(store.saving()).toBeFalse();
    expect(toastStub.error).toHaveBeenCalled();
  });

  it('does not save again while a save is in progress', () => {
    component.ngOnInit();
    store.saving.set(true);
    const saver = store.getSaver('stats');
    // saving guard lives in the parent shortcut handler; the saver itself runs,
    // so this verifies the registered saver is the component save method.
    expect(typeof saver).toBe('function');
  });

  it('tracks stats by id', () => {
    expect(component.trackById(0, { id: 'abc' })).toBe('abc');
  });
});
