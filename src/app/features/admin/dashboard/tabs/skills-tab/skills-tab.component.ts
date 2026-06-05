import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DragListDirective } from '@core/directives/drag-list.directive';
import { Skill } from '@core/models';
import { AdminContentStore } from '@core/services/admin-content.store';
import { AdminService } from '@core/services/admin.service';
import { ConfirmService } from '@core/services/confirm.service';
import { ContentService } from '@core/services/content.service';
import { LoadingService } from '@core/services/loading.service';
import { CustomSliderComponent } from '@shared/components/custom-slider.component';
import { ToastService } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-skills-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, DragListDirective, CustomSliderComponent],
  templateUrl: './skills-tab.component.html',
  styleUrls: ['./skills-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsTabComponent implements OnInit, OnDestroy {
  private store = inject(AdminContentStore);
  private adminService = inject(AdminService);
  private contentService = inject(ContentService);
  private loadingService = inject(LoadingService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  skillsEdit: Skill[] = [];
  showAddSkill = false;
  newSkill: Partial<Skill> = this.emptySkill();

  get saving(): boolean {
    return this.store.saving();
  }

  ngOnInit(): void {
    this.skillsEdit = JSON.parse(JSON.stringify(this.store.content()?.skills ?? []));
    this.store.registerSaver('skills', () => this.saveSkills());
  }

  ngOnDestroy(): void {
    this.store.unregisterSaver('skills');
  }

  markDirty(): void {
    this.store.markDirty('skills');
  }

  private syncContentSkills(skills: Skill[]): void {
    const current = this.store.content();
    if (current) {
      this.store.content.set({ ...current, skills: JSON.parse(JSON.stringify(skills)) });
    }
  }

  saveSkills(): void {
    const loaderKey = 'admin-skills-save';
    const normalizedSkills = this.skillsEdit.map((skill, index) =>
      this.normalizeSkill(skill, index),
    );
    const validationError = this.validateSkills(normalizedSkills);
    if (validationError) {
      this.toast.error(validationError);
      return;
    }

    this.skillsEdit = normalizedSkills;
    this.store.saving.set(true);
    this.loadingService.start(loaderKey);
    this.adminService.updateSkills(normalizedSkills).subscribe({
      next: () => {
        this.syncContentSkills(normalizedSkills);
        this.store.saving.set(false);
        this.loadingService.stop(loaderKey);
        this.store.clearDirty('skills');
        this.toast.success('Skills saved!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.saving.set(false);
        this.loadingService.stop(loaderKey);
        this.toast.error('Save failed');
        this.cdr.markForCheck();
      },
    });
  }

  addSkillTag(skill: Skill, e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v && !skill.tags.includes(v)) {
      skill.tags.push(v);
      (e.target as HTMLInputElement).value = '';
      this.markDirty();
    }
  }

  removeSkillTag(skill: Skill, tag: string): void {
    skill.tags = skill.tags.filter((t) => t !== tag);
    this.markDirty();
  }

  async deleteSkill(id: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete Skill',
      message: 'This skill will be permanently removed from your portfolio.',
      confirmText: 'Delete',
      type: 'danger',
      icon: '🗑️',
    });
    if (!ok) return;
    this.skillsEdit = this.skillsEdit.filter((s) => s.id !== id);
    this.cdr.markForCheck();
    this.adminService.deleteSkill(id).subscribe({
      next: () => {
        this.syncContentSkills(this.skillsEdit);
        this.toast.success('Skill deleted');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Delete failed'),
    });
  }

  submitAddSkill(): void {
    const skill = this.normalizeSkill(
      {
        id: `skill_${Date.now()}`,
        ...this.newSkill,
      },
      this.skillsEdit.length,
    );
    const validationError = this.validateSkill(skill, 'New skill');
    if (validationError) {
      this.toast.error(validationError);
      return;
    }

    this.adminService.addSkill(skill).subscribe({
      next: (res) => {
        const savedSkill = this.normalizeSkill(res.data || skill, this.skillsEdit.length);
        this.skillsEdit.push(savedSkill);
        this.syncContentSkills(this.skillsEdit);
        this.showAddSkill = false;
        this.newSkill = this.emptySkill();
        this.toast.success('Skill added!');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Add failed'),
    });
  }

  onReorder(newIds: string[]): void {
    const orderPayload = newIds.map((id, idx) => ({ id, displayOrder: idx }));
    const map: Record<string, number> = {};
    orderPayload.forEach((o) => (map[o.id] = o.displayOrder));
    const sorted = [...this.skillsEdit].sort(
      (a, b) => (map[a.id] ?? a.displayOrder) - (map[b.id] ?? b.displayOrder),
    );
    sorted.forEach((item, idx) => (item.displayOrder = idx));
    this.skillsEdit = sorted;
    this.contentService.reorder('skills', orderPayload).subscribe({
      next: () => this.toast.success('displayOrder saved'),
      error: () => this.toast.error('Reorder failed'),
    });
  }

  addTagToNew(list: string[], e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v && !list.includes(v)) {
      list.push(v);
      (e.target as HTMLInputElement).value = '';
    }
  }

  removeTagFromNew(list: string[], tag: string): void {
    const i = list.indexOf(tag);
    if (i > -1) list.splice(i, 1);
  }

  skillLevel(proficiency: number | null | undefined): string {
    const value = this.normalizeSkillProficiency(proficiency);
    if (value >= 90) return 'Expert';
    if (value >= 75) return 'Advanced';
    if (value >= 60) return 'Strong';
    return 'Growing';
  }

  skillLevelClass(proficiency: number | null | undefined): string {
    const value = this.normalizeSkillProficiency(proficiency);
    if (value >= 90) return 'elite';
    if (value >= 75) return 'advanced';
    if (value >= 60) return 'strong';
    return 'growing';
  }

  skillExperienceLabel(value: string | null | undefined): string {
    const normalized = this.normalizeSkillYears(value);
    if (!normalized) return 'Experience optional';
    if (/^1$/.test(normalized)) return '1 year';
    if (/^\d+$/.test(normalized)) return `${normalized} years`;
    if (/^\d+\+$/.test(normalized)) return `${normalized} years`;
    return /years?|yrs?/i.test(normalized) ? normalized : `${normalized} years`;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  emptySkill(): Partial<Skill> {
    return {
      name: '',
      icon: '⚡',
      accentColor: '#f5a623',
      description: '',
      tags: [],
      proficiency: 80,
      yearsExp: '1+',
    };
  }

  private validateSkills(skills: Partial<Skill>[]): string | null {
    if (!skills.length) return 'Add at least one skill before saving.';
    for (let index = 0; index < skills.length; index += 1) {
      const error = this.validateSkill(skills[index], `Skill ${index + 1}`);
      if (error) return error;
    }
    return null;
  }

  private validateSkill(skill: Partial<Skill>, fallbackLabel: string): string | null {
    const name = this.normalizeSkillName(skill.name);
    if (!name) return `${fallbackLabel} needs a name.`;
    if (!this.normalizeSkillDescription(skill.description)) {
      return `${name} needs a short description.`;
    }
    if (!this.normalizeSkillTags(skill.tags).length) {
      return `${name} needs at least one tag.`;
    }
    if (!this.isValidSkillColor(skill.accentColor)) {
      return `${name} needs a valid hex color like #f5a623.`;
    }
    if (!this.isValidSkillYears(skill.yearsExp)) {
      return `${name} has invalid experience format. Use examples like 3, 5+, or 1-2.`;
    }
    return null;
  }

  private normalizeSkill(skill: Partial<Skill>, displayOrder: number): Skill {
    return {
      id: String(skill.id || `skill_${Date.now()}_${displayOrder}`),
      name: this.normalizeSkillName(skill.name),
      icon: String(skill.icon || '⚡').trim() || '⚡',
      accentColor: String(skill.accentColor || '#f5a623').trim() || '#f5a623',
      description: this.normalizeSkillDescription(skill.description),
      tags: this.normalizeSkillTags(skill.tags),
      proficiency: this.normalizeSkillProficiency(skill.proficiency),
      yearsExp: this.normalizeSkillYears(skill.yearsExp),
      displayOrder,
    };
  }

  private normalizeSkillName(value: string | null | undefined): string {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSkillDescription(value: string | null | undefined): string {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSkillTags(tags: string[] | null | undefined): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const rawTag of tags || []) {
      const tag = String(rawTag || '').trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(tag);
    }
    return normalized;
  }

  private normalizeSkillYears(value: string | null | undefined): string {
    return String(value || '')
      .replace(/\s*(years?|yrs?)\.?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSkillProficiency(value: number | string | null | undefined): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 80;
    const clamped = Math.min(100, Math.max(10, numericValue));
    return Math.round(clamped / 5) * 5;
  }

  private isValidSkillColor(value: string | null | undefined): boolean {
    const color = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(color);
  }

  private isValidSkillYears(value: string | null | undefined): boolean {
    const years = this.normalizeSkillYears(value);
    if (!years) return true;
    return /^\d{1,2}(\+)?$/.test(years) || /^\d{1,2}-\d{1,2}$/.test(years);
  }
}
