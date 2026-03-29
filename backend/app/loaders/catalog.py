"""
Catalog loader for XLSX and CSV files.

Loads product catalog from various formats and maps Russian field names to domain model.
"""

import pandas as pd
from pathlib import Path
from typing import List, Optional, Dict, Any
import logging

from app.domain import Product
from app.parsers.characteristics import parse_and_create_attributes

logger = logging.getLogger(__name__)

# Mapping from Russian field names to domain field names
FIELD_MAPPING = {
    "id сте": "id",
    "название сте": "title",
    "ссылка на картинку сте": "image_url",
    "модель": "model",
    "страна происхождения": "country_origin",
    "производитель": "manufacturer",
    "id категории": "category_id",
    "название категории": "category_name",
    "характеристики": "attributes_raw",
}


class CatalogLoader:
    """Loader for product catalog files."""
    
    def __init__(self, file_path: Optional[str] = None):
        """
        Initialize loader.
        
        Args:
            file_path: Path to catalog file (XLSX or CSV). If None, uses sample data.
        """
        self.file_path = Path(file_path) if file_path else None
    
    def load_catalog(self) -> List[Product]:
        """
        Load catalog from file or return sample data.
        
        Returns:
            List of Product objects
        """
        if self.file_path and self.file_path.exists():
            logger.info(f"Loading catalog from {self.file_path}")
            return self._load_from_file()
        else:
            logger.info("Using sample catalog data")
            return self._load_sample_data()
    
    def _load_from_file(self) -> List[Product]:
        """Load catalog from XLSX or CSV file."""
        try:
            if self.file_path.suffix.lower() == '.xlsx':
                df = pd.read_excel(self.file_path)
            elif self.file_path.suffix.lower() == '.csv':
                df = pd.read_csv(self.file_path, encoding='utf-8')
            else:
                raise ValueError(f"Unsupported file format: {self.file_path.suffix}")
            
            return self._process_dataframe(df)
        except Exception as e:
            logger.error(f"Failed to load catalog from {self.file_path}: {e}")
            # Fallback to sample data
            return self._load_sample_data()
    
    def _process_dataframe(self, df: pd.DataFrame) -> List[Product]:
        """Process pandas DataFrame into Product objects."""
        products = []
        
        for _, row in df.iterrows():
            try:
                product_data = self._map_row_to_product_data(row)
                if product_data:
                    product = Product(**product_data)
                    products.append(product)
            except Exception as e:
                logger.warning(f"Failed to process row: {e}, skipping")
                continue
        
        logger.info(f"Loaded {len(products)} products from catalog")
        return products
    
    def _map_row_to_product_data(self, row) -> Optional[Dict[str, Any]]:
        """Map DataFrame row to Product constructor data."""
        # Map Russian field names to domain names
        mapped_data = {}
        for ru_field, domain_field in FIELD_MAPPING.items():
            if ru_field in row.index and pd.notna(row[ru_field]):
                mapped_data[domain_field] = str(row[ru_field]).strip()
        
        # Ensure required fields
        required_fields = ['id', 'title', 'manufacturer', 'model', 'category_id', 'category_name']
        if not all(field in mapped_data for field in required_fields):
            return None
        
        # Set defaults for optional fields
        mapped_data.setdefault('image_url', '')
        mapped_data.setdefault('country_origin', '')
        mapped_data.setdefault('attributes_raw', None)
        
        # Parse attributes
        if mapped_data.get('attributes_raw'):
            mapped_data['attributes'] = parse_and_create_attributes(mapped_data['attributes_raw'])
        else:
            mapped_data['attributes'] = []
        
        return mapped_data
    
    def _load_sample_data(self) -> List[Product]:
        """Load sample catalog data for testing."""
        sample_csv_path = Path(__file__).parent.parent.parent / "data" / "sample_catalog.csv"
        
        if sample_csv_path.exists():
            # Load from sample CSV
            df = pd.read_csv(sample_csv_path, encoding='utf-8')
            return self._process_dataframe(df)
        else:
            # Fallback to hardcoded sample data
            return self._create_hardcoded_sample()
    
    def _create_hardcoded_sample(self) -> List[Product]:
        """Create hardcoded sample products."""
        sample_products = [
            {
                'id': 'prod_001',
                'title': 'Лaptop ProBook 450',
                'manufacturer': 'HP',
                'model': 'ProBook 450',
                'category_id': 'cat_001',
                'category_name': 'Ноутбуки',
                'image_url': 'https://example.com/laptop.jpg',
                'country_origin': 'Китай',
                'attributes_raw': 'Процессор:Intel Core i5;Оперативная память:16 ГБ;Жесткий диск:512 ГБ SSD',
            },
            {
                'id': 'prod_002',
                'title': 'Смартфон Galaxy S23',
                'manufacturer': 'Samsung',
                'model': 'Galaxy S23',
                'category_id': 'cat_002',
                'category_name': 'Смартфоны',
                'image_url': 'https://example.com/phone.jpg',
                'country_origin': 'Южная Корея',
                'attributes_raw': 'Экран:6.1 дюйм;Камера:50 МП;Батарея:3900 мАч',
            },
            {
                'id': 'prod_003',
                'title': 'Монитор UltraWide 34"',
                'manufacturer': 'LG',
                'model': '34WN650-W',
                'category_id': 'cat_003',
                'category_name': 'Мониторы',
                'image_url': 'https://example.com/monitor.jpg',
                'country_origin': 'Мексика',
                'attributes_raw': 'Разрешение:3440x1440;Частота:75 Гц;Тип матрицы:IPS',
            },
            {
                'id': 'prod_004',
                'title': 'Клавиатура механическая',
                'manufacturer': 'Keychron',
                'model': 'K8',
                'category_id': 'cat_004',
                'category_name': 'Клавиатуры',
                'image_url': 'https://example.com/keyboard.jpg',
                'country_origin': 'Китай',
                'attributes_raw': 'Переключатели:Blue;Подсветка:RGB;Интерфейс:Bluetooth',
            },
            {
                'id': 'prod_005',
                'title': 'Мышь беспроводная',
                'manufacturer': 'Logitech',
                'model': 'MX Master 3',
                'category_id': 'cat_005',
                'category_name': 'Мыши',
                'image_url': 'https://example.com/mouse.jpg',
                'country_origin': 'Швейцария',
                'attributes_raw': 'DPI:4000;Количество кнопок:7;Батарея:70 дней',
            },
        ]
        
        products = []
        for data in sample_products:
            data['attributes'] = parse_and_create_attributes(data.get('attributes_raw'))
            products.append(Product(**data))
        
        return products
