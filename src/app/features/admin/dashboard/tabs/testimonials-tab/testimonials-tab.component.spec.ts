import { TestBed } from '@angular/core/testing';
import { Testimonial } from '@core/models';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ContentService } from '@core/services/content.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { TestimonialsTabComponent } from './testimonials-tab.component';

/**
 * Logic test for the testimonials tab's `ratingStars` helper used to render
 * the star row. The heavy template is overridden and `ngOnInit` is not called.
 */
describe('TestimonialsTabComponent (logic)', () => {
  let component: TestimonialsTabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestimonialsTabComponent],
      providers: [
        { provide: AdminService, useValue: {} },
        { provide: ContentService, useValue: { getImageUrl: (s: string) => s } },
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
      ],
    })
      .overrideComponent(TestimonialsTabComponent, {
        set: { template: '<div></div>', styles: [], imports: [] },
      })
      .compileComponents();

    component = TestBed.createComponent(TestimonialsTabComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ratingStars returns an array of the given length', () => {
    expect(component.ratingStars(3).length).toBe(3);
    const t: Testimonial = { rating: 4 } as Testimonial;
    expect(component.ratingStars(t.rating).length).toBe(4);
  });
});
