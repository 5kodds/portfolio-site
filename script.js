document.documentElement.classList.add('js');

(async () => {
  const portrait = document.querySelector('.hero-portrait img');
  if (!portrait) return;

  try {
    const urls = [
      'assets/portrait-hd/part1.txt',
      'assets/portrait-hd/part2.txt',
      'assets/portrait-hd/part3.txt',
      'assets/portrait-hd/part4.txt'
    ];

    const parts = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('Portrait asset failed: ' + url);
        return response.text();
      })
    );

    portrait.src = 'data:image/webp;base64,' + parts.join('').replace(/\s+/g, '');
  } catch (error) {
    console.warn('HD portrait fallback in use', error);
  }
})();