import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { PortfolioContent, Skill } from '@core/models';

@Component({
  selector: 'app-skills-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills-section.component.html',
  styleUrls: ['./skills-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SkillsSectionComponent {
  @Input({ required: true }) content!: PortfolioContent;

  trackBySkill(_: number, item: Skill): string {
    return item.id;
  }

  normalizedSkillProficiency(value: number | null | undefined): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 80;
    return Math.min(100, Math.max(10, Math.round(numericValue)));
  }

  skillLevel(proficiency: number | null | undefined): string {
    const value = this.normalizedSkillProficiency(proficiency);
    if (value >= 90) return 'Expert';
    if (value >= 75) return 'Advanced';
    if (value >= 60) return 'Strong';
    return 'Growing';
  }

  skillLevelClass(proficiency: number | null | undefined): string {
    const value = this.normalizedSkillProficiency(proficiency);
    if (value >= 90) return 'elite';
    if (value >= 75) return 'advanced';
    if (value >= 60) return 'strong';
    return 'growing';
  }

  formatSkillExperience(value: string | null | undefined): string {
    const normalized = String(value || '')
      .replace(/\s*(years?|yrs?)\.?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return 'Flexible experience';
    if (/^1$/.test(normalized)) return '1 year';
    if (/^\d+$/.test(normalized)) return `${normalized} years`;
    if (/^\d+\+$/.test(normalized)) return `${normalized} years`;
    return /years?|yrs?/i.test(normalized) ? normalized : `${normalized} years`;
  }

  extraSkills(): string[] {
    const fromSettings = this.content?.siteSettings?.hero?.extraSkills || [];
    const cleaned = fromSettings
      .map((item) => String(item || '').trim())
      .filter((item) => item.length > 0);
    if (cleaned.length) return Array.from(new Set(cleaned));
    return [];
  }

  getDisplayTags(tags: string[]): string[] {
    return tags.slice(0, 4);
  }

  getExtraTagCount(tags: string[]): number {
    return Math.max(0, tags.length - 4);
  }
}
