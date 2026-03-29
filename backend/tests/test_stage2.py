"""
Tests for Stage 2 components: parsers, loaders, repository.
"""

import pytest
from app.parsers.characteristics import parse_characteristics, parse_and_create_attributes
from app.domain import Product, ProductAttribute
from app.loaders.catalog import CatalogLoader
from app.storage.repository import InMemoryProductRepository
from pathlib import Path


class TestCharacteristicsParser:
    """Tests for characteristics parser."""

    def test_parse_characteristics_valid_string(self):
        """Test parsing valid characteristics string."""
        raw = "Ширина профиля:256 мм;Тип:Бескамерная;Индекс скорости:A3"
        result = parse_characteristics(raw)
        
        expected = {
            "Ширина профиля": "256 мм",
            "Тип": "Бескамерная",
            "Индекс скорости": "A3"
        }
        assert result == expected

    def test_parse_characteristics_none_input(self):
        """Test parsing None input."""
        result = parse_characteristics(None)
        assert result == {}

    def test_parse_characteristics_empty_string(self):
        """Test parsing empty string."""
        result = parse_characteristics("")
        assert result == {}

    def test_parse_characteristics_whitespace_only(self):
        """Test parsing whitespace-only string."""
        result = parse_characteristics("   ")
        assert result == {}

    def test_parse_characteristics_malformed_entries(self):
        """Test parsing string with malformed entries."""
        raw = "Ширина профиля:256 мм;invalid_entry;Тип:Бескамерная"
        result = parse_characteristics(raw)
        
        expected = {
            "Ширина профиля": "256 мм",
            "Тип": "Бескамерная"
        }
        assert result == expected

    def test_parse_characteristics_trim_whitespace(self):
        """Test that keys and values are trimmed."""
        raw = " Ширина профиля : 256 мм ; Тип : Бескамерная "
        result = parse_characteristics(raw)
        
        expected = {
            "Ширина профиля": "256 мм",
            "Тип": "Бескамерная"
        }
        assert result == expected

    def test_parse_and_create_attributes(self):
        """Test creating ProductAttribute objects."""
        raw = "Ширина профиля:256 мм;Тип:Бескамерная"
        attributes = parse_and_create_attributes(raw)
        
        assert len(attributes) == 2
        assert attributes[0].name == "Ширина профиля"
        assert attributes[0].value == "256 мм"
        assert attributes[1].name == "Тип"
        assert attributes[1].value == "Бескамерная"


class TestCatalogLoader:
    """Tests for catalog loader."""

    def test_load_sample_data(self):
        """Test loading sample data when no file provided."""
        loader = CatalogLoader()
        products = loader.load_catalog()
        
        assert len(products) > 0
        assert all(isinstance(p, Product) for p in products)
        
        # Check first product has required fields
        first_product = products[0]
        assert first_product.id
        assert first_product.title
        assert first_product.manufacturer
        assert first_product.model
        assert first_product.category_id
        assert first_product.category_name

    def test_load_from_csv_file(self, tmp_path):
        """Test loading from CSV file."""
        # Create test CSV
        csv_content = """id сте,название сте,производитель,модель,страна происхождения,id категории,название категории,характеристики
test_001,Test Product,Test Manufacturer,Test Model,Country,test_cat,Test Category,Attr1:Value1;Attr2:Value2"""
        
        csv_file = tmp_path / "test_catalog.csv"
        csv_file.write_text(csv_content, encoding='utf-8')
        
        loader = CatalogLoader(str(csv_file))
        products = loader.load_catalog()
        
        assert len(products) == 1
        product = products[0]
        assert product.id == "test_001"
        assert product.title == "Test Product"
        assert product.manufacturer == "Test Manufacturer"
        assert product.attributes_raw == "Attr1:Value1;Attr2:Value2"
        assert len(product.attributes) == 2


class TestInMemoryRepository:
    """Tests for in-memory product repository."""

    def test_load_and_get_products(self):
        """Test loading products and retrieving them."""
        repo = InMemoryProductRepository()
        
        # Create test products
        products = [
            Product(
                id="prod_001",
                title="Test Product 1",
                manufacturer="Test Manufacturer",
                model="Model 1",
                category_id="cat_001",
                category_name="Test Category",
                image_url="",
                country_origin="",
                attributes_raw="Attr:Value"
            ),
            Product(
                id="prod_002", 
                title="Test Product 2",
                manufacturer="Test Manufacturer",
                model="Model 2",
                category_id="cat_001",
                category_name="Test Category",
                image_url="",
                country_origin="",
                attributes_raw="Attr:Value"
            )
        ]
        
        repo.load_products(products)
        
        # Test get all
        all_products = repo.get_all_products()
        assert len(all_products) == 2
        
        # Test get by id
        product = repo.get_product_by_id("prod_001")
        assert product is not None
        assert product.id == "prod_001"
        
        # Test get non-existent
        assert repo.get_product_by_id("non_existent") is None

    def test_search_products_by_title(self):
        """Test searching products by title."""
        repo = InMemoryProductRepository()
        
        products = [
            Product(
                id="prod_001",
                title="Laptop ProBook",
                manufacturer="HP",
                model="ProBook 450",
                category_id="cat_001",
                category_name="Laptops",
                image_url="",
                country_origin="",
                attributes_raw=""
            )
        ]
        
        repo.load_products(products)
        
        result = repo.search_products("laptop", limit=10, offset=0)
        
        assert result["total_count"] == 1
        assert len(result["results"]) == 1
        assert result["results"][0].id == "prod_001"

    def test_search_products_by_manufacturer(self):
        """Test searching products by manufacturer."""
        repo = InMemoryProductRepository()
        
        products = [
            Product(
                id="prod_001",
                title="Test Product",
                manufacturer="Samsung",
                model="Model X",
                category_id="cat_001",
                category_name="Electronics",
                image_url="",
                country_origin="",
                attributes_raw=""
            )
        ]
        
        repo.load_products(products)
        
        result = repo.search_products("samsung", limit=10, offset=0)
        
        assert result["total_count"] == 1
        assert result["results"][0].manufacturer == "Samsung"

    def test_search_products_by_attributes(self):
        """Test searching products by attributes."""
        repo = InMemoryProductRepository()
        
        products = [
            Product(
                id="prod_001",
                title="Test Product",
                manufacturer="Test",
                model="Model",
                category_id="cat_001",
                category_name="Category",
                image_url="",
                country_origin="",
                attributes_raw="Разрешение:4K;Частота:60 Гц"
            )
        ]
        
        repo.load_products(products)
        
        result = repo.search_products("4k", limit=10, offset=0)
        
        assert result["total_count"] == 1

    def test_search_empty_query(self):
        """Test search with empty query returns no results."""
        repo = InMemoryProductRepository()
        
        products = [
            Product(
                id="prod_001",
                title="Test Product",
                manufacturer="Test",
                model="Model",
                category_id="cat_001",
                category_name="Category",
                image_url="",
                country_origin="",
                attributes_raw=""
            )
        ]
        
        repo.load_products(products)
        
        result = repo.search_products("", limit=10, offset=0)
        
        assert result["total_count"] == 0
        assert len(result["results"]) == 0

    def test_search_pagination(self):
        """Test search pagination."""
        repo = InMemoryProductRepository()
        
        products = [
            Product(
                id=f"prod_{i:03d}",
                title=f"Product {i}",
                manufacturer="Test",
                model=f"Model {i}",
                category_id="cat_001",
                category_name="Category",
                image_url="",
                country_origin="",
                attributes_raw=""
            ) for i in range(5)
        ]
        
        repo.load_products(products)
        
        # Search with limit
        result = repo.search_products("product", limit=2, offset=0)
        
        assert result["total_count"] == 5
        assert len(result["results"]) == 2
        
        # Search with offset
        result = repo.search_products("product", limit=2, offset=2)
        
        assert result["total_count"] == 5
        assert len(result["results"]) == 2