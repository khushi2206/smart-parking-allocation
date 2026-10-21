/**
 * RouteWise - Entry Script
 * Automatically redirects to the proper page or initializes the app
 */

const page = window.location.pathname.split('/').pop() || 'index.html';
console.log(`RouteWise initialized on page: ${page}`);
