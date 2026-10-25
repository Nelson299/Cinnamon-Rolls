// ============================================================
//  BAKES BY EL — site settings
//  This is the one file to edit each week (flavors, photos, etc.)
// ============================================================

window.BAKERY = {
  name: 'Bakes by El',
  venmoUser: 'ellinelson1',
  textNumber: '(701) 306-9643',
  deliveryArea: 'Anywhere within 20 miles of West Fargo, ND',

  // Paste your Google Apps Script web app URL here (see README.md, step 2).
  // Until this is filled in, orders and email sign-ups are NOT saved anywhere.
  ordersEndpoint: 'https://script.google.com/macros/s/AKfycbzTRuWLa4TdtfJa8zeN9atjiIkzPEPNX54cVUQtXtVZKEAZrOWxvK4EUXUAJc0e37gh/exec',

  // Ordering window, in Central Time. Opens Sunday 12:00 AM,
  // closes Thursday at 8 PM. Delivery is the Saturday after.
  timeZone: 'America/Chicago',
  closeDay: 4,      // 0 = Sunday ... 4 = Thursday
  closeHour: 20,    // 24-hour clock, 20 = 8 PM

  // This week's flavors. The first one should stay the Original.
  // price: 3 for the Original, 4 for gourmet flavors.
  flavors: [
    {
      id: 'original',
      name: 'Original Cinnamon Roll',
      price: 3,
      gourmet: false,
      desc: 'Soft dough, brown-sugar cinnamon filling, cream cheese icing.',
      ingredients: 'Flour, butter, brown sugar, cinnamon, milk, eggs, powdered sugar, cream cheese, yeast, sugar, vanilla',
      allergens: 'Wheat, milk, eggs',
      img: 'images/original.webp'
    },
    {
      id: 'raspberry',
      name: 'Raspberry',
      price: 4,
      gourmet: true,
      desc: 'Our original roll swirled with a sweet raspberry filling under cream cheese icing.',
      ingredients: 'Everything in the original, plus raspberries and cornstarch',
      allergens: 'Wheat, milk, eggs',
      img: '' // photo coming soon
    },
    {
      id: 'chai',
      name: 'Chai',
      price: 4,
      gourmet: true,
      desc: 'Our original roll with a warm chai-spiced filling and chai cream cheese icing.',
      ingredients: 'Everything in the original, plus chai spices (cardamom, ginger, cloves, nutmeg, black pepper)',
      allergens: 'Wheat, milk, eggs',
      img: '' // photo coming soon
    }
  ],

  // "Past & future flavors" section on the homepage.
  pastAndFuture: [
    { name: 'Funfetti', img: 'images/funfetti.png' },
    { name: 'Butter Pecan', img: 'images/butter-pecan.webp' },
    { name: 'Blueberry', img: 'images/blueberry.webp' },
    { name: 'Tres Leches', img: 'images/tres-leches.webp' }
  ],

  // Saved flavors for later weeks. Not shown on the site.
  // To bring one back, copy it into `flavors` (or `pastAndFuture`) above.
  // Photos for all of these are kept in the images/ folder.
  flavorLibrary: [
    {
      id: 'caramel-apple',
      name: 'Caramel Apple',
      price: 4,
      gourmet: true,
      desc: 'Our original roll filled with cinnamon apples and drizzled with homemade caramel.',
      ingredients: 'Everything in the original, plus apples, cornstarch and caramel (sugar, butter, heavy cream)',
      allergens: 'Wheat, milk, eggs',
      img: 'images/caramel-apple.webp'
    },
    {
      id: 'maple-pecan',
      name: 'Maple Pecan',
      price: 4,
      gourmet: true,
      desc: 'Our original roll with maple cream cheese icing and toasted pecans.',
      ingredients: 'Everything in the original, plus pecans and maple syrup',
      allergens: 'Wheat, milk, eggs, tree nuts (pecans)',
      img: 'images/maple-pecan.webp'
    },
    {
      id: 'peach-cobbler',
      name: 'Peach Cobbler',
      price: 4,
      gourmet: true,
      desc: 'Our original roll with sweet cinnamon peaches and a buttery cobbler crumble.',
      ingredients: 'Everything in the original, plus peaches and cornstarch',
      allergens: 'Wheat, milk, eggs',
      img: 'images/peach-cobbler.webp'
    },
    {
      id: 'salted-caramel',
      name: 'Salted Caramel',
      price: 4,
      gourmet: true,
      desc: 'Our original roll drizzled with homemade caramel and a pinch of sea salt.',
      ingredients: 'Everything in the original, plus caramel (sugar, butter, heavy cream) and sea salt',
      allergens: 'Wheat, milk, eggs',
      img: 'images/salted-caramel.webp'
    },
    {
      id: 'apple-streusel',
      name: 'Apple Cinnamon with Streusel',
      price: 4,
      gourmet: true,
      desc: 'Our original roll with warm cinnamon apples and a crumbly streusel topping.',
      ingredients: 'Everything in the original, plus apples and cornstarch',
      allergens: 'Wheat, milk, eggs',
      img: 'images/apple-streusel.webp'
    },
    {
      id: 'cookies-and-cream',
      name: 'Cookies and Cream',
      price: 4,
      gourmet: true,
      desc: 'Our original roll loaded with crushed Oreo cookies.',
      ingredients: 'Everything in the original, plus Oreo cookies',
      allergens: 'Wheat, milk, eggs, soy',
      img: 'images/cookies-and-cream.webp'
    },
    {
      id: 'strawberry-rhubarb',
      name: 'Strawberry Rhubarb',
      price: 4,
      gourmet: true,
      desc: 'Our original roll with a sweet-tart strawberry rhubarb filling.',
      ingredients: 'Everything in the original, plus strawberries, rhubarb and cornstarch',
      allergens: 'Wheat, milk, eggs',
      img: 'images/strawberry-rhubarb.webp'
    },
    {
      id: 'biscoff',
      name: 'Biscoff',
      price: 4,
      gourmet: true,
      desc: 'Our original roll with Biscoff cookie butter, topped with crushed Biscoff cookies.',
      ingredients: 'Everything in the original, plus Biscoff cookies and Biscoff cookie butter',
      allergens: 'Wheat, milk, eggs, soy',
      img: 'images/biscoff-2.webp' // other photo: images/biscoff.webp
    },
    { name: 'Pumpkin', img: 'images/pumpkin.webp' },
    { name: 'Banana Bread', img: 'images/banana-bread.webp' },
    { name: 'Tiramisu', img: 'images/tiramisu.webp' },
    { name: 'Butter Pecan', img: 'images/butter-pecan.webp' },
    { name: 'Funfetti', img: 'images/funfetti.png' },
    { name: 'Blueberry', img: 'images/blueberry.webp' },
    { name: 'Tres Leches', img: 'images/tres-leches.webp' }
  ]
};
