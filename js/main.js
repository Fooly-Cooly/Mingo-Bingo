let bsMovieInfoCarousel;

/* Year JSON cache — keyed by year string, populated on first fetch */
const movieCache = {};

/* Column index sets for shuffle — one per MINGO column */
const COLUMNS = [
	[0, 5, 10, 15, 20],  /* M */
	[1, 6, 11, 16, 21],  /* I */
	[2, 7, 12, 17, 22],  /* N */
	[3, 8, 13, 18, 23],  /* G */
	[4, 9, 14, 19, 24],  /* O */
];
const FREE_INDEX = 12;

/* ── Touch swipe navigation ──────────────────────────────────────────────── */
document.addEventListener( "touchstart", event => {
	bsMovieInfoCarousel.touchStartY = event.changedTouches[0].screenY,
	bsMovieInfoCarousel.touchStartX = event.changedTouches[0].screenX;
});
document.addEventListener( "touchend", event => {
	let touchEndY   = event.changedTouches[0].screenY,
		touchEndX   = event.changedTouches[0].screenX,
		touchStartY = bsMovieInfoCarousel.touchStartY,
		touchStartX = bsMovieInfoCarousel.touchStartX,
		touchDiffY  = Math.abs( touchStartY - touchEndY ),
		touchDiffX  = Math.abs( touchStartX - touchEndX );

	if ( touchDiffY > touchDiffX && touchDiffY > 5 )
		( touchStartY < touchEndY ) ? nav_Modal( "ArrowUp" ) : nav_Modal( "ArrowDown" );
	else if ( touchDiffY < touchDiffX && touchDiffX > 5 )
		( touchStartX < touchEndX ) ? nav_Modal( "ArrowLeft" ) : nav_Modal( "ArrowRight" );
});

/* ── Keyboard navigation ─────────────────────────────────────────────────── */
document.addEventListener( "keydown", function( event ) {
	if ( [ "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" ].includes( event.key ) )
		nav_Modal( event.key );
});

function nav_Modal( event ) {
	let movieModal = document.getElementById( "movieInfo" );
	if ( !bsMovieInfoCarousel._isSliding && ( window.getComputedStyle( movieModal ).display != "none" ) ) {
		let carIndex = Array.prototype.indexOf.call( bsMovieInfoCarousel._items, bsMovieInfoCarousel._activeElement );
		switch ( event ) {
			case "ArrowUp":    carIndex += carIndex < 5  ?  20 : -5; break;
			case "ArrowDown":  carIndex += carIndex > 19 ? -20 :  5; break;
			case "ArrowLeft":  carIndex -= 1; break;
			case "ArrowRight": carIndex += 1; break;
		}
		bsMovieInfoCarousel.to( carIndex );
		carIndex=null;
	}
}

/* ── DOMContentLoaded ────────────────────────────────────────────────────── */
document.addEventListener( "DOMContentLoaded", function() {

	let urlParams = new URLSearchParams( window.location.search ).get( "year" ),
		year      = urlParams ? urlParams : "2023";

	/* Set copyright year */
	document.getElementById( "copyright-year" ).textContent = new Date().getFullYear();

	document.querySelector( ".carousel-control-up"  ).addEventListener( "click", function(){ nav_Modal( "ArrowUp"   ); });
	document.querySelector( ".carousel-control-down" ).addEventListener( "click", function(){ nav_Modal( "ArrowDown" ); });
	document.getElementById( "shuffle-btn" ).addEventListener( "click", function( e ) {
		e.preventDefault();
		shuffle_Mingo();
	});

	/* Fetch years manifest, build nav, then load the target year */
	fetch( "./jsons/years.json" )
	.then( r => {
		if ( !r.ok ) throw "Could not load years.json";
		return r.json();
	})
	.then( years => {
		build_Nav( years );
		load_Mingo( year );
		urlParams=null, year=null;
	})
	.catch( error => { console.log( error ); });
});

/* ── Window load (hide loader, start confetti) ───────────────────────────── */
window.addEventListener( "load", function() {
	setTimeout( function() {
		const loader = document.querySelector( ".loader" );
		loader.style.opacity = '0';
		setTimeout( function(){ loader.style.display = "none"; }, 500 );
		startConfetti();
	}, 4000 );
}, false );

/* ── Build year nav from manifest ────────────────────────────────────────── */
function build_Nav( years ) {

	let carInner = document.getElementById( "yearCarouselInner" ),
		pages    = [],
		pageSize = 3;

	/* Group years into pages of 3 */
	for ( let i = 0; i < years.length; i += pageSize )
		pages.push( years.slice( i, i + pageSize ) );

	let lastPage = pages.length - 1;

	/* Build all page HTML in one pass, set innerHTML once */
	carInner.innerHTML = pages.map( ( page, pi ) =>
		`<div class="carousel-item btn-group ${ pi === lastPage ? 'active' : '' }">${
			page.map( y => `<a id="${y}" class="btn nav-year">${y}</a>` ).join('')
		}</div>`
	).join('');

	carInner=null, pages=null, lastPage=null;

	/* Wire click listeners now that buttons exist in the DOM */
	let yearBtns = document.getElementsByClassName( "nav-year" );
	for ( let i = 0; i < yearBtns.length; i++ ) {
		let btn = yearBtns[i];
		btn.addEventListener( "click", function() { load_Mingo( btn.id ); } );
	}

	yearBtns=null;
}

/* ── Fetch a year JSON, cache it, return promise ─────────────────────────── */
function fetch_Year( year ) {
	if ( movieCache[year] ) return Promise.resolve( movieCache[year] );
	return fetch( `./jsons/${year}.json` )
		.then( r => {
			if ( !r.ok ) throw `404 File Not Found: ${year}.json`;
			return r.json();
		})
		.then( movies => { movieCache[year] = movies; return movies; });
}

/* ── Render the board from a movies array ────────────────────────────────── */
function render_Board( movies, activeYear ) {

	const color = [ 'M', 'I', 'N', 'G', 'O' ];
	let tBody1    = document.getElementById( "mingo-body" ),
		tBody2    = tBody1.cloneNode( true ),
		tCells    = tBody2.getElementsByTagName( "td" ),
		carousel1 = document.getElementById( "carouselMovieInfo" ),
		carousel2 = carousel1.cloneNode( true ),
		carInner  = carousel2.querySelector( "#carouselMovieInfo .carousel-inner" ),
		carIndic  = carousel2.querySelector( "#carouselMovieInfo .carousel-indicators" ),
		innerHtml = [],
		indicHtml = [];

	for ( let i=0, j=0, k=1; i < tCells.length; i++, j++ ) {
		if ( j > 4 ) j=0, k++;
		tCells[i].childNodes[0].childNodes[0].style.backgroundImage = `url("${movies[i].poster}")`;
		tCells[i].childNodes[0].childNodes[1].innerHTML = movies[i].name;

		innerHtml.push( `<article class="carousel-item ${ i == 0 ? "active" : '' }"><table width="100%" height="100%"><tbody><tr><td rowspan="0"><img class="poster ${color[j]}" src="${movies[i].poster}" loading="lazy"></td></tr><tr><td colspan="2"><h2>${movies[i].name}</h2></td></tr><tr><td class="w-50 text-nowrap"><span class="float-end">Year:</span></td><td class="w-50">${movies[i].year}</td></tr><tr><td class="w-50 text-nowrap"><span class="float-end">${movies[i].ratingNameOne}:</span></td><td class="w-50"><span class="rating stars-${movies[i].ratingOne}"></span></td></tr><tr><td class="w-50 text-nowrap"><span class="float-end">${movies[i].ratingNameTwo}:</span></td><td class="w-50"><span class="rating stars-${movies[i].ratingTwo}"></span></td></tr><tr><td colspan="2"><p>${movies[i].description}</p></td></tr></tbody></table></article>` );

		indicHtml.push( `<button class="nav-item ${ i == 0 ? ' active' : '' }" type="button" data-bs-target="#carouselMovieInfo" data-bs-slide-to="${i}" aria-label="Slide ${i}">${color[j]}${k}</button>` );
	}

	carInner.innerHTML = innerHtml.join('');
	carIndic.innerHTML = indicHtml.join('');

	tBody1.replaceWith( tBody2 );
	carousel1.replaceWith( carousel2 );
	bsMovieInfoCarousel = new bootstrap.Carousel( carousel2 );

	/* Update year nav highlight — null when shuffle is active */
	let yearBtns = document.getElementsByClassName( "nav-year" );
	for ( let i = 0; i < yearBtns.length; i++ )
		yearBtns[i].classList.remove( "active" );

	if ( activeYear ) {
		let yearNode = document.getElementById( activeYear );
		if ( yearNode ) {
			yearNode.classList.add( "active" );
			let yearIndx = Array.prototype.indexOf.call( yearNode.parentNode.parentNode.children, yearNode.parentNode );
			new bootstrap.Carousel( document.getElementById( "historyCarouselControls" ) ).to( yearIndx );
			yearNode=null, yearIndx=null;
		}
	}

	/* Shuffle button reflects active state */
	document.getElementById( "shuffle-btn" ).classList.toggle( "active", activeYear === null );

	tBody1=null, tBody2=null, tCells=null, carousel1=null, carousel2=null, carInner=null, carIndic=null, innerHtml=null, indicHtml=null, movies=null, yearBtns=null;
}

/* ── Load a specific year ────────────────────────────────────────────────── */
function load_Mingo( year ) {
	fetch_Year( year )
	.then( movies => render_Board( movies, year ) )
	.catch( error => { console.log( error ); });
}

/* ── Shuffle: one random movie per column slot across all years ──────────── */
function shuffle_Mingo() {

	let allYearBtns = document.getElementsByClassName( "nav-year" ),
		allYears    = Array.from( allYearBtns ).map( b => b.id ),
		uncached    = allYears.filter( y => !movieCache[y] );

	/* Fetch anything not yet cached in parallel, then render */
	Promise.all( uncached.map( fetch_Year ) )
	.then( () => {

		let card = new Array( 25 );

		/* Free space is always fixed at center */
		card[FREE_INDEX] = movieCache[ allYears[0] ][ FREE_INDEX ];

		/* Per column: build pool from that column slot across all years,
		   partial Fisher-Yates to pick without replacement */
		for ( let col = 0; col < 5; col++ ) {
			let slots = COLUMNS[col].filter( idx => idx !== FREE_INDEX ),
				pool  = allYears.flatMap( y =>
					COLUMNS[col]
						.filter( idx => idx !== FREE_INDEX )
						.map( idx => movieCache[y][idx] )
						.filter( m => m && m.name !== "Free Space" )
				),
				picked = [];

			for ( let i = 0; i < slots.length; i++ ) {
				let randIdx = i + Math.floor( Math.random() * ( pool.length - i ) );
				[ pool[i], pool[randIdx] ] = [ pool[randIdx], pool[i] ];
				picked.push( pool[i] );
			}

			slots.forEach( ( slotIdx, i ) => { card[slotIdx] = picked[i]; });
			slots=null, pool=null, picked=null;
		}

		render_Board( card, null );
		card=null, allYearBtns=null, allYears=null, uncached=null;
	})
	.catch( error => { console.log( error ); });
}
