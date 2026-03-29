import sys
sys.path.insert(0, r'c:\Users\witch\Desktop\Smart Product Search\backend')

from app.storage.repository import InMemoryProductRepository
from app.domain import Product

# Create repository and test product
repo = InMemoryProductRepository()
products = [
    Product(
        id='1',
        title='Телефон Samsung Galaxy',
        manufacturer='Samsung',
        model='Galaxy S23',
        category_id='1',
        category_name='Телефоны',
        image_url='',
        country_origin='',
        attributes_raw=''
    )
]
repo.load_products(products)

# Test search
result = repo.search_products('телефон')
print(f'Search results: {len(result["results"])} products')
if result["results"]:
    print(f'First result: {result["results"][0].title}')

# Test another search
result2 = repo.search_products('samsung')
print(f'Samsung search results: {len(result2["results"])} products')