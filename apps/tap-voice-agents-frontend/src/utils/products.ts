export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Classic White Shirt",
    price: 89,
    category: "Shirts",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop",
    description: "Premium cotton dress shirt"
  },
  {
    id: 2,
    name: "Navy Blazer",
    price: 249,
    category: "Blazers",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=400&fit=crop",
    description: "Slim-fit wool blazer"
  },
  {
    id: 3,
    name: "Dark Denim Jeans",
    price: 129,
    category: "Jeans",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop",
    description: "Stretch denim, modern fit"
  },
  {
    id: 4,
    name: "Brown Leather Loafers",
    price: 179,
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400&h=400&fit=crop",
    description: "Italian leather, dress casual"
  },
  {
    id: 5,
    name: "Burgundy Polo Shirt",
    price: 79,
    category: "Shirts",
    image: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=400&fit=crop",
    description: "Pique cotton polo"
  },
  {
    id: 6,
    name: "Tan Chinos",
    price: 99,
    category: "Pants",
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop",
    description: "Stretch cotton chinos"
  },
  {
    id: 7,
    name: "Black Dress Shoes",
    price: 199,
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&h=400&fit=crop",
    description: "Oxford cap-toe leather"
  },
  {
    id: 8,
    name: "Charcoal Sweater",
    price: 119,
    category: "Sweaters",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
    description: "Merino wool crewneck"
  }
];

// Helper function to find product by name (for voice agent)
export function findProductByName(name: string): Product | undefined {
  const searchName = name.toLowerCase();
  return PRODUCTS.find(product => 
    product.name.toLowerCase().includes(searchName) ||
    product.category.toLowerCase().includes(searchName)
  );
}

// Helper function to get product by ID
export function getProductById(id: number): Product | undefined {
  return PRODUCTS.find(product => product.id === id);
}

