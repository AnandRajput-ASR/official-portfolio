import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Hero } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-hero-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hero-tab.component.html',
  styleUrls: ['./hero-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroTabComponent implements OnInit, OnDestroy {
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  heroEdit!: Hero;

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.heroEdit = JSON.parse(JSON.stringify(this.store.content()?.hero ?? {}));
    this.store.registerSaver('hero', () => this.saveHero());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('hero');
  }

  markDirty(): void {
    this.store.markDirty('hero');
  }

  saveHero(): void {
    this.store.saving.set(true);
    const payload = { ...this.heroEdit, updated_at: Date.now() };
    this.adminService.updateHeroSection(payload).subscribe({
      next: (res) => {
        const current = this.store.content();
        if (current) {
          this.store.content.set({ ...current, hero: res.data ?? this.heroEdit });
        }
        this.store.saving.set(false);
        this.store.clearDirty('hero');
        this.toast.success('Hero saved!');
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
      },
    });
  }
}
