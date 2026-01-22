# 🛒 Grovio Admin Dashboard

A sophisticated, responsive admin dashboard for grocery store management with advanced image upload capabilities and comprehensive CRUD operations.

## ✨ Features

### 🎯 **Admin Dashboard (`/admin`)**
- **Statistics Overview**: Total products, in stock, out of stock, categories
- **Product Management Table**: View all products with images, categories, prices, stock status
- **Search Functionality**: Search by name, category, or brand
- **Quick Actions**: Edit and delete products with confirmation dialogs
- **Responsive Design**: Mobile-first approach with collapsible sidebar

### 🖼️ **Advanced Image Upload System**
- **🖱️ Drag & Drop**: Drag images directly into the upload area
- **📁 File Selection**: Click to browse and select from computer
- **🔗 URL Input**: Paste image URLs (auto-adds `.png` for blob URLs)
- **👁️ Image Previews**: See all uploaded images with remove option
- **✨ Auto-Extension**: Automatically adds `.png` to blob URLs

### **Comprehensive Product Form**
- **Basic Info**: Name, brand, description
- **Categories**: Dropdown with subcategories
- **Specifications**: Quantity, weight, volume, type, packaging
- **Stock Management**: In stock toggle, rating, reviews
- **Validation**: Required fields and error handling

### **CRUD Operations**
- **Create**: Add new products with full details
- **Read**: View all products in organized table
- **Update**: Edit existing products
- **Delete**: Remove products with confirmation

### 🏪 **Admin Store Management**
- **Zustand State**: Manages all product data
- **Real-time Updates**: Changes reflect immediately
- **Data Persistence**: Products persist in memory during session

##  Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grovio-admin
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run the development server**
   ```bash
   pnpm dev
   ```

4. **Open your browser**
   - Main page: [http://localhost:3000](http://localhost:3000)
   - Admin Dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Icons**: Lucide React
- **UI Components**: Custom components with Tailwind
- **Build Tool**: Turbopack (dev mode)

## 📁 Project Structure

```
grovio-admin/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx          # Admin dashboard page
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Landing page
│   ├── components/
│   │   ├── ImageUpload.tsx       # Advanced image upload component
│   │   ├── ProductForm.tsx       # Product creation/editing form
│   │   ├── ProductsTable.tsx     # Products management table
│   │   └── StatsDashboard.tsx    # Statistics overview
│   ├── lib/
│   │   └── utils.ts              # Utility functions
│   ├── store/
│   │   └── adminStore.ts         # Zustand store for state management
│   └── types/
│       └── grocery.ts            # TypeScript type definitions
├── public/                        # Static assets
├── package.json                   # Dependencies and scripts
└── README.md                     # This file
```

## 🎨 Key Components

### ImageUpload Component
```typescript
// Auto-adds .png to blob URLs
if (imageUrl.includes("blob.v0.dev") && !imageUrl.endsWith(".png")) {
  imageUrl += ".png"
}
```

### Multi-Upload Support
- Drag multiple files at once
- Select multiple files from computer
- Add multiple URLs
- Preview all images before saving

### Professional UI
- Clean, modern design matching Grovio branding
- Responsive layout for mobile and desktop
- Toast notifications for user feedback
- Loading states and error handling

## 📱 Responsive Design

The admin dashboard is fully responsive with:
- **Mobile-first approach**
- **Collapsible sidebar** on mobile devices
- **Touch-friendly interactions**
- **Optimized layouts** for all screen sizes
- **Progressive enhancement**

## 🔧 Customization

### Adding New Categories
```typescript
// In adminStore.ts
const newCategory = {
  id: generateId(),
  name: "New Category",
  subcategories: ["Sub 1", "Sub 2"]
}
```

### Modifying Product Fields
```typescript
// In types/grocery.ts
interface GroceryProduct {
  // Add your custom fields here
  customField?: string
}
```

##  Deployment

### Build for Production
```bash
pnpm build
```

### Start Production Server
```bash
pnpm start
```

### Environment Variables
Create a `.env.local` file for any environment-specific configurations.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:
- Check the [Issues](../../issues) page
- Create a new issue with detailed information
- Contact the development team

## 🙏 Acknowledgments

- Built with Next.js and Tailwind CSS
- Icons provided by Lucide React
- State management with Zustand
- Modern React patterns and best practices

---

**Made with ❤️ by the Grovio Team**
