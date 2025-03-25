import Footer from '../../components/include/Footer';
import Header from '../../components/include/Header';
import ProductGrid from '../Product/ProductGrid'; // 추가

const Home = () => {
  return (
   <>
   <Header/>
    <div className="flex flex-col bg-gray-50 font-['Noto_Sans_KR']">
      {/* Navbar */}

      {/* Search Section */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="flex items-center w-full mb-12">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="영양제 검색하기"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
            />
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          </div>
          <button className="rounded ml-4 px-8 py-3 bg-teal-500 text-white hover:bg-teal-600 transition-colors">
            검색
          </button>
        </div>

        {/* Product Grid 컴포넌트 사용 */}
        <ProductGrid />
      </div>
    </div>
    <Footer/>
    </>
  );
};

export default Home;
