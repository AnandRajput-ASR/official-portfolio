import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Stat } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-stats-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stats-tab.component.html',
  styleUrls: ['./stats-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsTabComponent implements OnInit, OnDestroy {
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  statsEdit: Stat[] = [];

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.statsEdit = JSON.parse(JSON.stringify(this.store.content()?.stats || []));
    this.store.registerSaver('stats', () => this.saveStats());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('stats');
  }

  markDirty(): void {
    this.store.markDirty('stats');
  }

  saveStats(): void {
    this.store.saving.set(true);
    this.adminService.updateStats(this.statsEdit).subscribe({
      next: (res) => {
        const current = this.store.content();
        if (current) {
          this.store.content.set({
            ...current,
            stats: JSON.parse(JSON.stringify(res.data)),
          });
        }
        this.store.saving.set(false);
        this.store.clearDirty('stats');
        this.toast.success('Stats saved!');
      },
      error: () => {
        this.store.saving.set(false);
        this.toast.error('Save failed');
      },
    });
  }

  addStat(): void {
    this.statsEdit.push({ id: 's_' + Date.now(), value: 0, suffix: '+', label: 'New Stat' });
    this.markDirty();
  }

  deleteStat(id: string): void {
    this.statsEdit = this.statsEdit.filter((s) => s.id !== id);
    this.markDirty();
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
