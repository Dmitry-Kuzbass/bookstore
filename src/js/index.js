import '../scss/main.scss';

// ==========================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ (STATE) ПРИЛОЖЕНИЯ
// ==========================================
const state = {
    currentCategory: 'Architecture', // Текущая активная категория по умолчанию
    startIndex: 0,                   // С какой позиции подгружать книги (для пагинации)
    maxResults: 6,                   // Всегда загружаем по 6 штук
    cart: JSON.parse(localStorage.getItem('bookstore_cart')) || [] // Подгружаем сохраненную корзину из памяти
};

const API_KEY = "";

// ==========================================
// 1. ЛОГИКА СЛАЙДЕРА
// ==========================================
const initSlider = () => {
    const slides = document.querySelectorAll('.slider__slide');
    const dots = document.querySelectorAll('.slider__dot');
    let currentSlide = 0;
    let sliderInterval;

    const changeSlide = (index) => {
        if (!slides.length || !dots.length) return;
        slides[currentSlide].classList.remove('slider__slide--active');
        dots[currentSlide].classList.remove('slider__dot--active');
        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide].classList.add('slider__slide--active');
        dots[currentSlide].classList.add('slider__dot--active');
    };

    const startAutoPlay = () => {
        sliderInterval = setInterval(() => { changeSlide(currentSlide + 1); }, 5000);
    };

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            changeSlide(index);
            clearInterval(sliderInterval);
            startAutoPlay();
        });
    });

    startAutoPlay();
};

// ==========================================
// 2. ОБНОВЛЕНИЕ БЕЙДЖИКА КОРЗИНЫ В ШАПКЕ
// ==========================================
const updateCartBadge = () => {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;

    const count = state.cart.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
};

// ==========================================
// 3. РАБОТА С GOOGLE BOOKS API И РЕНДЕР КАРТОЧЕК
// ==========================================

const createBookCard = (book) => {
    const volumeInfo = book.volumeInfo;
    const saleInfo = book.saleInfo;
    const bookId = book.id;

    const coverUrl = volumeInfo.imageLinks?.thumbnail || 'https://unsplash.com';
    const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Неизвестный автор';
    const title = volumeInfo.title || 'Без названия';

    let ratingHtml = '';
    if (volumeInfo.averageRating) {
        const stars = '★'.repeat(Math.round(volumeInfo.averageRating)) + '☆'.repeat(5 - Math.round(volumeInfo.averageRating));
        const ratingsCount = volumeInfo.ratingsCount || 0;
        ratingHtml = `<div class="book-card__rating"><span class="book-card__stars">${stars}</span> (${ratingsCount})</div>`;
    } else {
        ratingHtml = `<div class="book-card__rating"><span class="book-card__stars">★★★★★</span> (12)</div>`;
    }

    const description = volumeInfo.description || 'Описание отсутствует.';

    let price = "550 ₽";
    if (saleInfo && saleInfo.listPrice) {
        price = `${saleInfo.listPrice.amount} RUB`;
    }

    const isInCart = state.cart.includes(bookId);
    const btnText = isInCart ? 'In cart' : 'Buy now';
    const btnClass = isInCart ? 'book-card__btn book-card__btn--active' : 'book-card__btn';

    return `
    <div class="book-card" data-id="${bookId}">
      <div class="book-card__image-wrapper">
        <img src="${coverUrl}" alt="${title}" class="book-card__img">
      </div>
      <div class="book-card__content">
        <div class="book-card__authors">${authors}</div>
        <h3 class="book-card__title">${title}</h3>
        ${ratingHtml}
        <p class="book-card__desc">${description}</p>
        <div class="book-card__price">${price}</div>
        <button class="${btnClass}">${btnText}</button>
      </div>
    </div>
  `;
};

// Функция загрузки книг
async function fetchBooks(isLoadMore = false) {
    const container = document.getElementById('books-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (!container || !loadMoreBtn) return;

    if (!isLoadMore) {
        container.innerHTML = '<div class="loader">Загрузка книг...</div>';
        state.startIndex = 0;
    }

    let url = `https://googleapis.com{state.currentCategory}&printType=books&startIndex=${state.startIndex}&maxResults=${state.maxResults}&langRestrict=en`;
    if (API_KEY) {
        url += `&key=${API_KEY}`;
    }

    try {
        loadMoreBtn.disabled = true;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка API');

        const data = await response.json();
        if (!isLoadMore) container.innerHTML = '';

        if (data.items && data.items.length > 0) {
            data.items.forEach(book => {
                container.insertAdjacentHTML('beforeend', createBookCard(book));
            });
            loadMoreBtn.style.display = data.items.length < state.maxResults ? 'none' : 'block';
        } else {
            throw new Error('Пустой ответ');
        }

    } catch (error) {
        // ПЛАН Б: Если API недоступно, принудительно выводим тестовые книги!
        console.log('Загружаем тестовые книги...');
        if (!isLoadMore) container.innerHTML = '';

        const mockBooks = [
            {
                id: `test_${state.currentCategory}_1`,
                volumeInfo: {
                    title: `Лучшие практики в категории ${state.currentCategory}`,
                    authors: ["Дмитрий Петров"],
                    description: "Эта тестовая книга создана специально для проверки корзины. Она содержит подробное описание проекта и легко добавляется в localStorage.",
                    averageRating: 5
                }
            },
            {
                id: `test_${state.currentCategory}_2`,
                volumeInfo: {
                    title: `Секреты мастерства: ${state.currentCategory}`,
                    authors: ["Анна Сидорова"],
                    description: "Второе демонстрационное издание. Нажмите кнопку Buy Now ниже, чтобы протестировать изменение внешнего вида кнопки.",
                    averageRating: 4
                }
            }
        ];

        mockBooks.forEach(book => {
            container.insertAdjacentHTML('beforeend', createBookCard(book));
        });

        loadMoreBtn.style.display = 'none'; // Скрываем кнопку "еще" для демо-данных
    } finally {
        loadMoreBtn.disabled = false;
    }
}

// ==========================================
// 4. ОБРАБОТКА КЛИКОВ (КАТЕГОРИИ, КОРЗИНА)
// ==========================================
const initEventListeners = () => {
    const categoriesList = document.getElementById('categories-list');
    const booksContainer = document.getElementById('books-container');

    if (categoriesList) {
        categoriesList.addEventListener('click', (e) => {
            const clickedItem = e.target.closest('.categories__item');
            if (!clickedItem || clickedItem.classList.contains('categories__item--active')) return;

            categoriesList.querySelector('.categories__item--active').classList.remove('categories__item--active');
            clickedItem.classList.add('categories__item--active');

            state.currentCategory = clickedItem.dataset.category;
            fetchBooks(false);
        });
    }

    if (booksContainer) {
        booksContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.book-card__btn');
            if (!btn) return;

            const card = btn.closest('.book-card');
            const bookId = card.dataset.id;

            if (!state.cart.includes(bookId)) {
                state.cart.push(bookId);
                btn.textContent = 'In cart';
                btn.classList.add('book-card__btn--active'); // Просто добавляем класс БЭМ
            } else {
                state.cart = state.cart.filter(id => id !== bookId);
                btn.textContent = 'Buy now';
                btn.classList.remove('book-card__btn--active'); // Просто удаляем класс БЭМ
            }

            localStorage.setItem('bookstore_cart', JSON.stringify(state.cart));
            updateCartBadge();
        });
    }
};

// ==========================================
// СТАРТ ПРИЛОЖЕНИЯ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initSlider();
    initEventListeners();
    updateCartBadge();
    fetchBooks(false);
});
