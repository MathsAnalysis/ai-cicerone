import type { ComponentChildren } from 'preact';

type Props = { open: boolean; title: string; onClose: () => void; children: ComponentChildren; footer?: ComponentChildren };

// Foglio dal basso con velo; resta montato e scivola con data-on per l'animazione.
export default function Sheet({ open, title, onClose, children, footer }: Props) {
  return (
    <>
      <div class="veil" data-on={open} onClick={onClose} aria-hidden="true" />
      <div class="sheet" data-on={open} role="dialog" aria-modal={open} aria-label={title} aria-hidden={!open}>
        <div class="mx-auto mt-2.5 h-1 w-[38px] flex-none rounded-[3px] bg-beige" />
        <header class="flex items-center gap-2.5 border-b border-line px-[22px] pt-3.5 pb-3">
          <h3 class="m-0 text-[19px]">{title}</h3>
          <button type="button" class="btn-x" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div class="overflow-y-auto px-[22px] pt-4 pb-6">{children}</div>
        {footer}
      </div>
    </>
  );
}
