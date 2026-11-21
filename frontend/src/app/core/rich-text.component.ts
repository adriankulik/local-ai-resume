import { Component, computed, input } from '@angular/core';
import { TextSegment, parseMarkdownLinks } from './rich-text';

@Component({
  selector: 'app-rich-text',
  standalone: true,
  template: `
    @for (seg of resolvedSegments(); track $index) {
      @switch (seg.type) {
        @case ('link') {
          <a
            [class]="linkClass()"
            [href]="seg.url"
            target="_blank"
            rel="noopener noreferrer"
            (click)="onLinkClick($event)"
            >{{ seg.label }}</a
          >
        }
        @case ('code') {
          <code [class]="codeClass()">{{ seg.text }}</code>
        }
        @case ('bold') {
          <strong
            >@if (seg.children) {
              <app-rich-text
                [segments]="seg.children"
                [linkClass]="linkClass()"
                [codeClass]="codeClass()"
                [stopLinkPropagation]="stopLinkPropagation()"
              />
            } @else {
              {{ seg.text }}
            }</strong
          >
        }
        @case ('italic') {
          <em
            >@if (seg.children) {
              <app-rich-text
                [segments]="seg.children"
                [linkClass]="linkClass()"
                [codeClass]="codeClass()"
                [stopLinkPropagation]="stopLinkPropagation()"
              />
            } @else {
              {{ seg.text }}
            }</em
          >
        }
        @default {
          {{ seg.text }}
        }
      }
    }
  `,
})
export class RichTextComponent {
  readonly text = input<string>('');
  readonly segments = input<TextSegment[] | null>(null);
  readonly linkClass = input<string>('');
  readonly codeClass = input<string>('');
  readonly stopLinkPropagation = input<boolean>(false);

  readonly resolvedSegments = computed(() => this.segments() ?? parseMarkdownLinks(this.text()));

  onLinkClick(event: MouseEvent): void {
    if (this.stopLinkPropagation()) {
      event.stopPropagation();
    }
  }
}
