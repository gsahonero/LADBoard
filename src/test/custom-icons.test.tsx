import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ModernIcon } from '../ui/components/ModernIcon';
import { SpaceManager } from '../core/space/space-manager';
import { MemoryStorageProvider } from '../core/storage/memory-provider';
import { resolveSpaceIcon } from '../core/theme/space-identity';

describe('Custom Icons & ModernIcon Rendering', () => {
  it('renders custom unmapped single emojis with role="img"', () => {
    const { container } = render(<ModernIcon name="🧪" size={24} />);
    const emojiSpan = container.querySelector('[role="img"]');
    expect(emojiSpan).toBeInTheDocument();
    expect(emojiSpan?.textContent).toBe('🧪');
  });

  it('renders mapped emoji shortcut as Lucide SVG component', () => {
    const { container } = render(<ModernIcon name="🚀" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains('lucide-rocket')).toBe(true);
  });

  it('renders complex multi-codepoint and ZWJ emojis properly without fallback to orbit', () => {
    // 👨‍👩‍👧‍👦 has length 8 in UTF-16 code units, but 1 grapheme cluster
    const { container } = render(<ModernIcon name="👨‍👩‍👧‍👦" size={24} />);
    const emojiSpan = container.querySelector('[role="img"]');
    expect(emojiSpan).toBeInTheDocument();
    expect(emojiSpan?.textContent).toBe('👨‍👩‍👧‍👦');
  });

  it('renders image URLs as <img> element', () => {
    const { container } = render(<ModernIcon name="https://example.com/custom-icon.png" size={24} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toBe('https://example.com/custom-icon.png');
  });

  it('renders data URLs as <img> element', () => {
    const dataUri = 'data:image/svg+xml;utf8,<svg></svg>';
    const { container } = render(<ModernIcon name={dataUri} size={24} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toBe(dataUri);
  });

  it('renders raw inline SVG strings as data URI <img>', () => {
    const svgCode = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
    const { container } = render(<ModernIcon name={svgCode} size={24} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toContain('data:image/svg+xml;utf8,');
  });

  it('renders standard Lucide mapped icons', () => {
    const { container } = render(<ModernIcon name="coffee" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains('lucide-coffee')).toBe(true);
  });

  it('renders short monograms when text is <= 4 characters', () => {
    const { container } = render(<ModernIcon name="AI" size={24} />);
    const monogramSpan = container.querySelector('span');
    expect(monogramSpan).toBeInTheDocument();
    expect(monogramSpan?.textContent).toBe('AI');
  });

  it('persists and resolves custom pasted icons in SpaceManager', async () => {
    const localStorage = new MemoryStorageProvider();
    const manager = new SpaceManager(localStorage);

    // 1. Create space with custom emoji icon
    const rocketSpace = await manager.createSpace({
      spaceName: 'Mars Project',
      description: 'Aerospace research',
      icon: '🚀',
      color: 'amber',
      categories: ['projects'],
      createdByUserId: 'usr_astronaut_01',
    });

    expect(rocketSpace.icon).toBe('🚀');
    expect(resolveSpaceIcon(rocketSpace.icon, rocketSpace.space_name)).toBe('🚀');

    // 2. Update space icon to a custom image URL
    const updated = await manager.updateSpaceManifest(rocketSpace.space_id, {
      icon: 'https://cdn.example.com/spaceship.svg',
    });

    expect(updated?.icon).toBe('https://cdn.example.com/spaceship.svg');
    expect(resolveSpaceIcon(updated?.icon, updated?.space_name)).toBe('https://cdn.example.com/spaceship.svg');

    // 3. Create space with Lucide name
    const labSpace = await manager.createSpace({
      spaceName: 'Clinical Trials Space',
      description: 'Phase II trials',
      icon: 'microscope',
      color: 'blue',
      categories: ['health'],
      createdByUserId: 'usr_doc_01',
    });
    expect(resolveSpaceIcon(labSpace.icon, labSpace.space_name)).toBe('microscope');
  });
});
