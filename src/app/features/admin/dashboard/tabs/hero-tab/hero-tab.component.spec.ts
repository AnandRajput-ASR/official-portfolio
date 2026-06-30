import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Hero } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { of, throwError } from 'rxjs';
import { HeroTabComponent } from './hero-tab.component';

describe('HeroTabComponent', () => {
  let component: HeroTabComponent;
  let fixture: ComponentFixture<HeroTabComponent>;
  let store: AdminContentStore;
  let adminStub: { updateHeroSection: jasmine.Spy };
  let toastStub: { success: jasmine.Spy; error: jasmine.Spy };

  const sampleHero: Hero = {
    name: 'Anand',
    title: 'Angular Dev',
    subtitle: 'Tagline',
    bio: 'Bio',
    email: 'a@b.com',
    linkedin: 'https://linkedin.com/in/x',
    github: 'https://github.com/x',
    location: 'Pune',
    availableForWork: true,
  } as Hero;

  beforeEach(async () => {
    adminStub = {
      updateHeroSection: jasmine
        .createSpy('updateHeroSection')
        .and.returnValue(of({ data: sampleHero })),
    };
    toastStub = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
    };

    await TestBed.configureTestingModule({
      imports: [HeroTabComponent],
      providers: [
        AdminContentStore,
        { provide: AdminService, useValue: adminStub },
        { provide: ToastService, useValue: toastStub },
      ],
    })
      .overrideComponent(HeroTabComponent, { set: { template: '<div></div>', styles: [] } })
      .compileComponents();

    store = TestBed.inject(AdminContentStore);
    store.content.set({ hero: sampleHero } as never);

    fixture = TestBed.createComponent(HeroTabComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('clones hero from the store on init', () => {
    component.ngOnInit();
    expect(component.heroEdit).toEqual(sampleHero);
    expect(component.heroEdit).not.toBe(sampleHero);
  });

  it('registers a saver on init and removes it on destroy', () => {
    component.ngOnInit();
    expect(store.getSaver('hero')).toBeDefined();
    component.ngOnDestroy();
    expect(store.getSaver('hero')).toBeUndefined();
  });

  it('marks the hero tab dirty', () => {
    component.markDirty();
    expect(store.isDirty('hero')).toBeTrue();
  });

  it('saves hero, updates store content, clears dirty and toasts success', () => {
    component.ngOnInit();
    store.markDirty('hero');
    component.saveHero();
    expect(adminStub.updateHeroSection).toHaveBeenCalled();
    expect(store.content()?.hero?.name).toBe('Anand');
    expect(store.isDirty('hero')).toBeFalse();
    expect(store.saving()).toBeFalse();
    expect(toastStub.success).toHaveBeenCalled();
  });

  it('sends an updated_at timestamp in the payload', () => {
    component.ngOnInit();
    component.saveHero();
    const payload = adminStub.updateHeroSection.calls.mostRecent().args[0];
    expect(payload.updated_at).toEqual(jasmine.any(Number));
  });

  it('toasts an error and resets saving when save fails', () => {
    adminStub.updateHeroSection.and.returnValue(throwError(() => new Error('boom')));
    component.ngOnInit();
    component.saveHero();
    expect(store.saving()).toBeFalse();
    expect(toastStub.error).toHaveBeenCalled();
  });
});
