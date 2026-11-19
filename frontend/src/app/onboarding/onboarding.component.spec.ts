import { TestBed } from '@angular/core/testing';
import { OnboardingComponent } from './onboarding.component';
import { VaultService } from '../core/vault.service';
import { LayoutService } from '../core/layout.service';

describe('OnboardingComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts at paste step and advances to review upon parsing', async () => {
    await TestBed.configureTestingModule({ imports: [OnboardingComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.step()).toBe('paste');

    comp.rawText.set('Alice Smith\nalice@example.com\n\nExperience\nDeveloper - Startup (2021 - Present)\n- Built apps');
    await comp.parse();

    expect(comp.step()).toBe('review');
    expect(comp.draft().contact.fullName).toBe('Alice Smith');
  });

  it('loads sample profile and transitions to review', async () => {
    await TestBed.configureTestingModule({ imports: [OnboardingComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    comp.loadSample();
    expect(comp.step()).toBe('review');
    expect(comp.draft().contact.fullName).toBe('Jan Kowalski');
  });

  it('completes onboarding when saved', async () => {
    await TestBed.configureTestingModule({ imports: [OnboardingComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    const layout = TestBed.inject(LayoutService);
    fixture.detectChanges();

    comp.loadSample();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const linkedinInput = el.querySelector('input[placeholder="linkedin.com/in/username"]') as HTMLInputElement | null;
    expect(linkedinInput).toBeTruthy();

    const primaryBtn = el.querySelector('.review-sticky-footer button.app-button--primary') as HTMLButtonElement | null;
    expect(primaryBtn?.textContent?.trim()).toBe('Save & continue');

    comp.saveAndProceed();

    expect(vs.onboarded()).toBeTrue();
    expect(layout.activeTab()).toBe('triage');
    expect(layout.isStepCompleted('vault')).toBeTrue();
  });
});
