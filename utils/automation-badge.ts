import icon32 from '../public/icon/32.png?inline';

const HOST_ATTR = 'data-gcp-auth-skip';

export function showAutomationBadge(): () => void {
  const existing = document.querySelector(`[${HOST_ATTR}]`);
  if (existing) {
    return () => existing.remove();
  }

  const host = document.createElement('div');
  host.setAttribute(HOST_ATTR, 'active');
  host.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'width:36px',
    'height:36px',
    'z-index:2147483647',
    'pointer-events:none',
  ].join(';');

  const shadow = host.attachShadow({ mode: 'closed' });
  const image = document.createElement('img');
  image.src = icon32;
  image.alt = 'GCP Auth Skip is active';
  image.width = 32;
  image.height = 32;
  image.style.cssText = [
    'display:block',
    'width:32px',
    'height:32px',
    'padding:2px',
    'border-radius:9px',
    'background:#fff',
    'box-shadow:0 2px 10px rgba(0,0,0,.18)',
  ].join(';');
  shadow.append(image);
  document.documentElement.append(host);

  return () => host.remove();
}
