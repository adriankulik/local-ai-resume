import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCheck, LucideFileDown, LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';
import { CollapsibleComponent } from '../collapsible/collapsible.component';
import { DropdownComponent } from '../dropdown/dropdown.component';
import { ToggleComponent } from '../toggle/toggle.component';
import { ButtonComponent } from '../button/button.component';
import { ExtensionService } from '../core/extension.service';
import { VaultService } from '../core/vault.service';
import { Experience, THEMES, ThemeName, VaultSettings, nextId } from '../core/vault.model';

const MM_PX = 96 / 25.4;
const A4_W = 210 * MM_PX;
const A4_H = 297 * MM_PX;

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [FormsModule, DropdownComponent, ToggleComponent, CollapsibleComponent, ButtonComponent],
  templateUrl: './preview.component.html',
})
export class PreviewComponent implements AfterViewInit, OnDestroy {
  readonly vs = inject(VaultService);
  readonly themes = THEMES;
  readonly exportIcon = LucideFileDown.icon;
  readonly editIcon = LucidePencil.icon;
  readonly plusIcon = LucidePlus.icon;
  readonly trashIcon = LucideTrash2.icon;
  readonly checkIcon = LucideCheck.icon;
  readonly closeIcon = LucideX.icon;

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly sheet = viewChild.required<ElementRef<HTMLElement>>('sheet');
  private ro?: ResizeObserver;

  readonly settingsOpen = signal(true);
  readonly editMode = signal(false);
  readonly pendingVaultPrompt = signal<{ label: string; commit: () => void } | null>(null);

  readonly newBulletDrafts = signal<Record<string, string>>({});
  readonly addingRole = signal(false);
  readonly newRole = signal({ role: '', company: '', startDate: '', endDate: '', bullet: '' });
  readonly addingEdu = signal(false);
  readonly newEdu = signal({ degree: '', institution: '', year: '' });
  readonly newSkill = signal('');
  readonly editingSummary = signal(false);
  readonly summaryDraft = signal('');

  readonly scale = signal(1);
  readonly sheetHeight = signal(A4_H);
  readonly overflow = computed(() => this.sheetHeight() > A4_H + 1);

  readonly s = this.vs.settings;
  readonly showPhoto = computed(() => this.s().showPhoto && !!this.vs.vault().contact.photoDataUrl);

  readonly summary = computed(() => (this.vs.hiddenSummary() ? '' : (this.vs.tailoredSummary() ?? this.vs.vault().summary)));
  readonly skills = computed(() => this.vs.tailoredSkills() ?? this.vs.vault().skills);

  /** Contact details split into primary communication info and web links */
  readonly primaryContact = computed(() => {
    const c = this.vs.vault().contact;
    return [c.email, c.phone, c.location].map((s) => s?.trim()).filter(Boolean);
  });

  readonly contactLinks = computed(() => {
    return (this.vs.vault().contact.links || [])
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({
        url: /^https?:\/\//i.test(l) ? l : `https://${l}`,
        display: l.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      }));
  });

  readonly rodoText = computed(() => {
    const company = this.s().rodoCompanyName.trim();
    const target = company ? ` by ${company}` : '';
    return (
      `I hereby consent to the processing of my personal data for the purposes of the recruitment process${target}, ` +
      'in accordance with Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 (GDPR).'
    );
  });

  ngAfterViewInit(): void {
    const update = () => {
      const w = this.stage().nativeElement.clientWidth;
      this.scale.set(Math.min(1, Math.max(0.3, (w - 8) / A4_W)));
      this.sheetHeight.set(this.sheet().nativeElement.offsetHeight);
    };
    this.ro = new ResizeObserver(() => queueMicrotask(update));
    this.ro.observe(this.stage().nativeElement);
    this.ro.observe(this.sheet().nativeElement);
    update();
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  set<K extends keyof VaultSettings>(key: K, value: VaultSettings[K]): void {
    this.vs.vault().settings[key] = value;
    this.vs.touch();
  }

  setTheme(v: ThemeName): void {
    this.set('theme', v);
  }

  // --- Visual editor helpers ---
  toggleEditMode(): void {
    this.editMode.update((v) => !v);
  }

  confirmVaultPrompt(): void {
    const p = this.pendingVaultPrompt();
    if (!p) return;
    p.commit();
    this.pendingVaultPrompt.set(null);
  }

  dismissVaultPrompt(): void {
    this.pendingVaultPrompt.set(null);
  }

  setBulletDraft(expId: string, value: string): void {
    this.newBulletDrafts.update((d) => ({ ...d, [expId]: value }));
  }

  addResumeBullet(expId: string): void {
    const text = (this.newBulletDrafts()[expId] ?? '').trim();
    if (!text) return;
    const id = `rb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const isResumeOnlyExp = this.vs.resumeOnlyExperience().some((e) => e.id === expId);

    if (isResumeOnlyExp) {
      this.vs.resumeOnlyExperience.update((list) =>
        list.map((e) => (e.id === expId ? { ...e, bullets: [...e.bullets, { id, text }] } : e)),
      );
    } else {
      this.vs.resumeOnlyBullets.update((map) => ({
        ...map,
        [expId]: [...(map[expId] ?? []), { id, text }],
      }));
    }
    this.setBulletDraft(expId, '');

    this.pendingVaultPrompt.set({
      label: 'bullet point',
      commit: () => {
        if (isResumeOnlyExp) {
          this.promoteResumeOnlyExperience(expId);
        } else {
          this.vs.addBullet(expId, text, true);
          this.vs.resumeOnlyBullets.update((map) => ({
            ...map,
            [expId]: (map[expId] ?? []).filter((b) => b.id !== id),
          }));
        }
      },
    });
  }

  removeResumeBullet(expId: string, bulletId: string): void {
    const inOverlay = (this.vs.resumeOnlyBullets()[expId] ?? []).some((b) => b.id === bulletId);
    if (inOverlay) {
      this.vs.resumeOnlyBullets.update((map) => ({
        ...map,
        [expId]: (map[expId] ?? []).filter((b) => b.id !== bulletId),
      }));
      return;
    }
    const inResumeExp = this.vs.resumeOnlyExperience().some((e) => e.id === expId);
    if (inResumeExp) {
      this.vs.resumeOnlyExperience.update((list) =>
        list.map((e) => (e.id === expId ? { ...e, bullets: e.bullets.filter((b) => b.id !== bulletId) } : e)),
      );
      return;
    }
    this.vs.toggleBullet(bulletId, false);
  }

  updateNewRoleField<K extends 'role' | 'company' | 'startDate' | 'endDate' | 'bullet'>(key: K, value: string): void {
    this.newRole.update((r) => ({ ...r, [key]: value }));
  }

  addResumeExperience(): void {
    const draft = this.newRole();
    const role = draft.role.trim();
    const company = draft.company.trim();
    if (!role && !company) return;

    const expId = `re_${Date.now()}`;
    const bulletText = draft.bullet.trim();
    const exp: Experience = {
      id: expId,
      role,
      company,
      startDate: draft.startDate.trim(),
      endDate: draft.endDate.trim(),
      bullets: bulletText ? [{ id: `rb_${Date.now()}`, text: bulletText }] : [],
    };
    this.vs.resumeOnlyExperience.update((list) => [...list, exp]);
    this.newRole.set({ role: '', company: '', startDate: '', endDate: '', bullet: '' });
    this.addingRole.set(false);

    this.pendingVaultPrompt.set({
      label: 'experience role',
      commit: () => this.promoteResumeOnlyExperience(expId),
    });
  }

  private promoteResumeOnlyExperience(expId: string): void {
    const target = this.vs.resumeOnlyExperience().find((e) => e.id === expId);
    if (!target) return;
    const addedBulletIds: string[] = [];
    this.vs.update((v) => {
      const newExpId = nextId(v, 'exp');
      const bullets = target.bullets.map((b) => {
        const bid = nextId(v, 'b');
        addedBulletIds.push(bid);
        return { id: bid, text: b.text };
      });
      v.experience.push({
        id: newExpId,
        role: target.role,
        company: target.company,
        startDate: target.startDate,
        endDate: target.endDate,
        bullets,
      });
    });
    for (const bid of addedBulletIds) {
      this.vs.toggleBullet(bid, true);
    }
    this.vs.resumeOnlyExperience.update((list) => list.filter((e) => e.id !== expId));
  }

  removeResumeExperience(exp: Experience): void {
    if (this.vs.resumeOnlyExperience().some((e) => e.id === exp.id)) {
      this.vs.resumeOnlyExperience.update((list) => list.filter((e) => e.id !== exp.id));
      return;
    }
    for (const b of exp.bullets) {
      this.vs.toggleBullet(b.id, false);
    }
    this.vs.resumeOnlyBullets.update((map) => {
      const copy = { ...map };
      delete copy[exp.id];
      return copy;
    });
  }

  updateNewEduField<K extends 'degree' | 'institution' | 'year'>(key: K, value: string): void {
    this.newEdu.update((e) => ({ ...e, [key]: value }));
  }

  addResumeEducation(): void {
    const draft = this.newEdu();
    const degree = draft.degree.trim();
    const institution = draft.institution.trim();
    if (!degree && !institution) return;

    const id = `redu_${Date.now()}`;
    const entry = { id, degree, institution, year: draft.year.trim() };
    this.vs.resumeOnlyEducation.update((list) => [...list, entry]);
    this.newEdu.set({ degree: '', institution: '', year: '' });
    this.addingEdu.set(false);

    this.pendingVaultPrompt.set({
      label: 'education entry',
      commit: () => {
        const current = this.vs.resumeOnlyEducation().find((e) => e.id === id);
        if (!current) return;
        this.vs.update((v) => {
          v.education.push({
            id: nextId(v, 'edu'),
            degree: current.degree,
            institution: current.institution,
            year: current.year,
          });
        });
        this.vs.resumeOnlyEducation.update((list) => list.filter((e) => e.id !== id));
      },
    });
  }

  removeResumeEducation(edId: string): void {
    if (this.vs.resumeOnlyEducation().some((e) => e.id === edId)) {
      this.vs.resumeOnlyEducation.update((list) => list.filter((e) => e.id !== edId));
      return;
    }
    this.vs.hiddenEducationIds.update((set) => {
      const next = new Set(set);
      next.add(edId);
      return next;
    });
  }

  addResumeSkill(): void {
    const skill = this.newSkill().trim();
    if (!skill) return;
    const base = this.vs.tailoredSkills() ?? [...this.vs.vault().skills];
    if (!base.includes(skill)) {
      this.vs.tailoredSkills.set([...base, skill]);
    }
    this.newSkill.set('');

    this.pendingVaultPrompt.set({
      label: 'skill',
      commit: () => {
        this.vs.update((v) => {
          if (!v.skills.includes(skill)) v.skills.push(skill);
        });
      },
    });
  }

  removeResumeSkill(skill: string): void {
    const base = this.vs.tailoredSkills() ?? [...this.vs.vault().skills];
    this.vs.tailoredSkills.set(base.filter((s) => s !== skill));
  }

  startEditSummary(): void {
    this.summaryDraft.set(this.summary());
    this.editingSummary.set(true);
  }

  saveResumeSummary(): void {
    const text = this.summaryDraft().trim();
    this.vs.hiddenSummary.set(false);
    this.vs.tailoredSummary.set(text);
    this.editingSummary.set(false);

    if (text && text !== this.vs.vault().summary) {
      this.pendingVaultPrompt.set({
        label: 'summary',
        commit: () => {
          this.vs.update((v) => {
            v.summary = text;
          });
        },
      });
    }
  }

  removeResumeSummary(): void {
    this.vs.hiddenSummary.set(true);
    this.editingSummary.set(false);
  }

  /** "2022-03" → "03/2022"; other strings pass through. */
  fmt(d: string): string {
    const m = /^(\d{4})-(\d{2})$/.exec(d.trim());
    return m ? `${m[2]}/${m[1]}` : d;
  }

  readonly ext = inject(ExtensionService);

  print(): void {
    this.ext.exportPdf(this.vs.vault().contact.fullName);
  }
}
