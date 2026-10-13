const stylesheetPromises = new Map<string, Promise<void>>();

export function loadStylesheet(document: Document, href: string): Promise<void> {
  const absoluteHref = new URL(href, document.baseURI).href;
  const existingPromise = stylesheetPromises.get(absoluteHref);
  if (existingPromise) {
    return existingPromise;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = absoluteHref;

  const promise = new Promise<void>((resolve, reject) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener(
      'error',
      () => {
        stylesheetPromises.delete(absoluteHref);
        link.remove();
        reject(new Error(`Failed to load stylesheet: ${absoluteHref}`));
      },
      { once: true },
    );
  });

  stylesheetPromises.set(absoluteHref, promise);
  document.head.append(link);
  return promise;
}
