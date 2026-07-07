(() => {
  const SELECTOR = '[data-cms-list][data-cms-type="ebooks"]';
  const FALLBACK_DELAY_MS = 1200;
  const STYLE_ID = 'edureach-ebook-cover-fix';

  function start() {
    injectEbookCoverStyles();

    document.querySelectorAll(SELECTOR).forEach((container) => {
      container.classList.add('ebooks-grid');
      window.setTimeout(() => restoreEbooks(container), FALLBACK_DELAY_MS);
    });
  }

  function injectEbookCoverStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ${SELECTOR} .cms-card {
        overflow: hidden;
      }

      ${SELECTOR} .cms-card-image {
        width: 100%;
        aspect-ratio: 3 / 4;
        height: auto;
        padding: 0.75rem;
        object-fit: contain;
        object-position: center;
        border: 1px solid rgba(6, 59, 130, 0.1);
        border-radius: var(--radius);
        background:
          linear-gradient(135deg, rgba(234, 243, 255, 0.96), rgba(255, 245, 217, 0.92)),
          var(--blue-soft);
      }

      ${SELECTOR} .cms-card h3 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `;

    document.head.append(style);
  }

  async function restoreEbooks(container) {
    if (!container || container.querySelector('.cms-card')) return;
    if (container.dataset.ebookFallbackLoading === 'true') return;

    container.dataset.ebookFallbackLoading = 'true';

    try {
      const response = await fetch('/api/wix-content?type=ebooks&limit=50&page=1', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const data = await response.json().catch(() => null);
      const items = Array.isArray(data?.items) ? data.items : [];

      if (!response.ok || !data?.configured || !items.length) return;
      if (container.querySelector('.cms-card')) return;

      container.innerHTML = '';
      const fragment = document.createDocumentFragment();
      items.forEach((item) => fragment.append(createCard(item)));
      container.append(fragment);
      container.dataset.ebookFallbackLoaded = 'true';
    } catch {
      // The normal CMS renderer keeps its existing user-facing error message.
    } finally {
      delete container.dataset.ebookFallbackLoading;
    }
  }

  function createCard(item) {
    const article = document.createElement('article');
    article.className = 'resource-card cms-card cms-card-ebooks reveal is-visible';

    if (item.image?.url) {
      const image = document.createElement('img');
      image.className = 'cms-card-image';
      image.src = item.image.url;
      image.alt = item.image.alt || item.title || 'EduReach ebook';
      image.loading = 'lazy';
      image.decoding = 'async';
      article.append(image);
    }

    const meta = document.createElement('p');
    meta.className = 'cms-meta';
    meta.textContent = item.category || 'Ebook';
    article.append(meta);

    const heading = document.createElement('h3');
    heading.textContent = item.title || 'EduReach ebook';
    article.append(heading);

    const badge = document.createElement('span');
    badge.className = 'cms-access-badge';
    if (item.accessType === 'paid') {
      badge.classList.add('is-paid');
      badge.textContent = formatPrice(item);
    } else {
      badge.textContent = 'Free';
    }
    article.append(badge);

    const description = document.createElement('p');
    description.textContent = item.excerpt || item.content || 'EduReach digital publication.';
    article.append(description);

    const actions = document.createElement('div');
    actions.className = 'cms-card-actions';

    if (item.accessType === 'paid' && window.EDUREACH_CART?.createAddToCartButton) {
      actions.append(window.EDUREACH_CART.createAddToCartButton(item));
    } else {
      const link = document.createElement('a');
      link.className = 'button button-primary button-small';
      link.href = item.accessType === 'free' && item.fileUrl
        ? item.fileUrl
        : item.detailUrl || `/ebooks/${encodeURIComponent(item.slug || '')}`;
      link.textContent = item.accessType === 'free' ? 'Download' : 'View Ebook';
      link.setAttribute('aria-label', `${link.textContent} ${item.title || 'ebook'}`);

      if (/^https?:\/\//i.test(link.href)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }

      actions.append(link);
    }

    article.append(actions);
    return article;
  }

  function formatPrice(item) {
    const amount = Number(item.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 'Paid';

    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: item.currency || 'ZAR'
    }).format(amount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
