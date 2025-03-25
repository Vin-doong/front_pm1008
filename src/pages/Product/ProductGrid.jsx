import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecommendations } from '../../services/api';

const ProductGrid = () => {
  const navigate = useNavigate();
  const [activeSet, setActiveSet] = useState(() => {
    const savedSet = localStorage.getItem('activeSet');
    return savedSet ? JSON.parse(savedSet) : 0;
  });
  
  const productset1 = [
    { icon: 'capsules', title: '비타민', description: '면역력 강화와 뼈 건강에 도움' },
    { icon: 'heart', title: '단백질', description: '심장 건강과 혈행 개선' },
    { icon: 'brain', title: '칼슘', description: '눈 건강과 시력 보호' },
    { icon: 'bone', title: '아연', description: '뼈와 관절 건강 관리' },
    { icon: 'bed', title: '프로바이오틱스', description: '숙면과 스트레스 관리' },
    { icon: 'shield-virus', title: '시스테인', description: '장 건강과 면역력 증진' },
    { icon: 'running', title: '엽산', description: '활동성 증진과 관절 보호' },
    { icon: 'apple-alt', title: '셀렌', description: '체중 관리와 대사 촉진' },
    { icon: 'sun', title: '나이아신', description: '노화 방지와 피부 건강' },
  ];
  const productset2 = [
    { icon: 'capsules', title: '피로회복', description: '면역력 강화와 뼈 건강에 도움' },
    { icon: 'heart', title: '골다공증', description: '심장 건강과 혈행 개선' },
    { icon: 'brain', title: '피부', description: '눈 건강과 시력 보호' },
    { icon: 'bone', title: '체지방', description: '뼈와 관절 건강 관리' },
    { icon: 'bed', title: '혈행', description: '숙면과 스트레스 관리' },
    { icon: 'shield-virus', title: '근육', description: '장 건강과 면역력 증진' },
    { icon: 'running', title: '신경', description: '활동성 증진과 관절 보호' },
    { icon: 'apple-alt', title: '콜레스테롤', description: '체중 관리와 대사 촉진' },
    { icon: 'sun', title: '관절', description: '노화 방지와 피부 건강' },
  ];
  // 현재 활성화된 세트의 products 배열
  const products = activeSet === 0 ? productset1 : productset2;
  
  // 세트 전환 함수
  const toggleProductSet = () => {
    const newSet = activeSet === 0 ? 1 : 0;
    setActiveSet(newSet);
    localStorage.setItem('activeSet', JSON.stringify(newSet)); // 탭 상태 저장
  };

  const productDetails = {
  "비타민": "비타민에 대한 상세 설명입니다.",
  "단백질": "단백질에 대한 상세 설명입니다.",
  "칼슘": "칼슘에 대한 상세 설명입니다.",
  "아연": "아연에 대한 상세 설명입니다.",
  "프로바이오틱스": "프로바이오틱스에 대한 상세 설명입니다.",
  "시스테인": "시스테인에 대한 상세 설명입니다.",
  "엽산": "엽산에 대한 상세 설명입니다.",
  "셀렌": "셀렌에 대한 상세 설명입니다.",
  "나이아신": "나이아신에 대한 상세 설명입니다.",
  "피로회복": "피로에 대한 상세 설명입니다.",
  "골다공증": "골다공증에 대한 상세 설명입니다.",
  "피부": "피부에 대한 상세 설명입니다.",
  "체지방": "체지방에 대한 상세 설명입니다.",
  "혈행": "혈행에 대한 상세 설명입니다.",
  "근육": "근육에 대한 상세 설명입니다.",
  "신경": "신경에 대한 상세 설명입니다.",
  "콜레스테롤": "콜레스테롤에 대한 상세 설명입니다.",
  "관절": "관절에 대한 상세 설명입니다."
};

  const handleCategoryClick = async (keyword) => {
    try {
      // 1. 키워드 저장
      localStorage.setItem('selectedKeyword', keyword);
      // 2.상세 설명 저장
      localStorage.setItem('productDescription', productDetails[keyword] || '');      
      // 3. API 호출
      const response = await getRecommendations(keyword);      
      // 4. 결과 저장
      localStorage.setItem('recommendedProducts', JSON.stringify(response.data));      
      // 5. 페이지 이동
      navigate('/productdetail');
    } catch (error) {
      console.error("추천 제품을 불러오는 중 오류 발생:", error);
    }
  };
  return (
    <div className="mx-auto max-w-8xl">
      {/* 탭 UI */}
      <div className="flex justify-center mb-8">
        <div className="flex border-b border-gray-200 w-full">
          <button
            className={`py-2 px-6 text-center flex-1 ${
              activeSet === 0
                ? 'border-b-2 border-teal-500 font-medium text-teal-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
           onClick={() => { setActiveSet(0); localStorage.setItem('activeSet', JSON.stringify(0)); }}
          >
            영양소
          </button>
          <button
            className={`py-2 px-6 text-center flex-1 ${
              activeSet === 1
                ? 'border-b-2 border-teal-500 font-medium text-teal-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setActiveSet(1); localStorage.setItem('activeSet', JSON.stringify(1)); }}
          >
            건강기능
          </button>
        </div>
      </div>
    {/* 제품 그리드 */}
      <div className="grid grid-cols-3 gap-8 mb-12 mx-auto max-w-8xl">
        {products.map((product, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleCategoryClick(product.title)}
          >
            <i className={`fas fa-${product.icon} text-3xl text-teal-500 mb-4`}></i>
            <h3 className="text-lg font-medium mb-2 text-gray-800">{product.title}</h3>
            <p className="text-gray-600">{product.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductGrid;