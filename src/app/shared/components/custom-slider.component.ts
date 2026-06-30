import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-custom-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-slider-container">
      <div
        class="slider-track"
        #track
        (click)="onTrackClick($event)"
        (mousedown)="onThumbMouseDown($event)"
      >
        <!-- Filled portion of track -->
        <div class="slider-fill" [style.width.%]="percentage"></div>

        <!-- Track markers -->
        <div class="slider-markers" *ngIf="showMarkers">
          <span class="marker" *ngFor="let marker of markers" [style.left.%]="marker"></span>
        </div>

        <!-- Thumb -->
        <div
          class="slider-thumb"
          [style.left.%]="percentage"
          [style.backgroundColor]="accentColor"
          (mousedown)="onThumbMouseDown($event)"
        ></div>
      </div>
    </div>
  `,
  styles: [
    `
      .custom-slider-container {
        width: 100%;
        position: relative;
        user-select: none;
      }

      .slider-track {
        position: relative;
        width: 100%;
        height: 6px;
        background: var(--border);
        border-radius: 3px;
        cursor: pointer;
        overflow: visible;
      }

      .slider-fill {
        position: absolute;
        height: 100%;
        background: var(--accent2);
        border-radius: 3px;
        left: 0;
        top: 0;
        transition: width 0.05s ease-out;
        pointer-events: none;
      }

      .slider-markers {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        pointer-events: none;
      }

      .marker {
        position: absolute;
        width: 2px;
        height: 100%;
        background: rgba(255, 255, 255, 0.3);
        top: 0;
        transform: translateX(-50%);
      }

      .slider-thumb {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--amber);
        top: 50%;
        left: 0;
        transform: translate(-50%, -50%);
        cursor: grab;
        border: 2px solid var(--bg);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: none;
        z-index: 10;

        &:active {
          cursor: grabbing;
        }
      }

      .slider-thumb:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
    `,
  ],
})
export class CustomSliderComponent implements OnInit {
  @Input() min = 10;
  @Input() max = 100;
  @Input() step = 5;
  @Input() value = 50;
  @Input() accentColor = '#ffb700';
  @Input() showMarkers = true;

  @Output() valueChange = new EventEmitter<number>();

  percentage = 50;
  markers: number[] = [];
  isDragging = false;

  @ViewChild('track') trackRef?: ElementRef<HTMLElement>;

  ngOnInit() {
    this.calculatePercentage();
    this.generateMarkers();
  }

  private calculatePercentage() {
    const range = this.max - this.min;
    this.percentage = ((this.value - this.min) / range) * 100;
  }

  private generateMarkers() {
    if (!this.showMarkers) {
      this.markers = [];
      return;
    }
    // Create markers at 0, 25, 50, 75, 100
    this.markers = [0, 25, 50, 75, 100];
  }

  onTrackClick(event: MouseEvent) {
    if (this.isDragging) return;

    const track = event.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

    this.setValueFromPercentage(percentage);
  }

  onThumbMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;

    const track = this.trackRef?.nativeElement;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

    this.setValueFromPercentage(percentage);
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isDragging = false;
  }

  private setValueFromPercentage(percentage: number) {
    const range = this.max - this.min;
    let newValue = (percentage / 100) * range + this.min;

    // Snap to step
    newValue = Math.round(newValue / this.step) * this.step;
    newValue = Math.max(this.min, Math.min(this.max, newValue));

    this.value = newValue;
    this.calculatePercentage();
    this.valueChange.emit(this.value);
  }
}
