import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import { ContentService } from './content.service';

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentService, provideHttpClient()],
    });
    service = TestBed.inject(ContentService);
  });

  it('returns empty string when image value is missing', () => {
    expect(service.getImageUrl(undefined)).toBe('');
  });

  it('returns absolute and data URLs unchanged', () => {
    const absolute = 'https://cdn.example.com/image.png';
    const dataUrl = 'data:image/png;base64,AAAA';

    expect(service.getImageUrl(absolute)).toBe(absolute);
    expect(service.getImageUrl(dataUrl)).toBe(dataUrl);
  });

  it('resolves uploaded image paths from the backend root', () => {
    expect(service.getImageUrl('/uploads/cert.png')).toBe(
      `${environment.api.baseUrl.replace(/\/api\/?$/, '')}/uploads/cert.png`,
    );
  });

  it('resolves non-upload relative paths from the assets base URL', () => {
    expect(service.getImageUrl('/avatars/user.png')).toBe(`${environment.assets.baseUrl}/avatars/user.png`);
  });
});
