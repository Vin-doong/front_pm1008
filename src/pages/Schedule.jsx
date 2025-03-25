import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useNavigate } from 'react-router-dom';
import Header from '../components/include/Header';
import Footer from '../components/include/Footer';
import './Schedule.css';
import styled from 'styled-components';
import Swal from 'sweetalert2';
import { 
  getSchedules, 
  createSchedule, 
  updateSchedule, 
  deleteSchedule,
  getSchedulesByTime
} from '../services/api';

// Localizer 설정
const localizer = momentLocalizer(moment);

// Drag and Drop 캘린더
const DnDCalendar = withDragAndDrop(Calendar);

// Styled Components로 캘린더 스타일링
const StyledCalendar = styled(DnDCalendar)`
  .rbc-event {
    background-color: #209696;
    color: white;
    border-radius: 4px;
    transition: background-color 0.3s ease;
    &:hover {
      background-color: #1a8c8c;
    }
  }
  .rbc-day-bg {
    background-color: #f0f8ff;
  }
  .rbc-today {
    background-color: #e0f7fa;
  }
  .rbc-header {
    background-color: #f0f8ff;
    padding: 8px 0;
    font-weight: bold;
  }
  .rbc-button-link {
    color: #333;
    &:hover {
      color: #209696;
    }
  }
  .rbc-off-range-bg {
    background-color: #f8f9fa;
  }
  .rbc-toolbar button {
    color: #209696;
    border-color: #209696;
    &:hover {
      background-color: #e0f7fa;
    }
    &.rbc-active {
      background-color: #209696;
      color: white;
    }
  }
`;

// 복용 기간 옵션
const durationOptions = [
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' },
  { value: 60, label: '60일' },
  { value: 90, label: '90일' },
  { value: 180, label: '6개월' },
  { value: 365, label: '1년' },
  { value: 0, label: '직접 입력' }
];

const Schedule = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [todayPlans, setTodayPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 폼 입력 상태
  const [supplementForm, setSupplementForm] = useState({
    supplementName: '',
    intakeTime: '아침',
    intakeStart: moment().format('YYYY-MM-DD'),
    intakeDistance: 30,
    memo: '',
    customDuration: false // 직접 입력 여부
  });
  
  // 모달 상태
  const [showEventModal, setShowEventModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  
  // 영양제 복용 시간대 옵션
  const timeSlots = ['아침', '점심', '저녁'];
  
  // 주간 계획 상태
  const [weeklyPlan, setWeeklyPlan] = useState({});
  
  // 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login');
      return;
    }
    
    // 초기 데이터 로드
    fetchSchedules();
    fetchTodayPlans();
  }, [navigate]);
  
  // 스케줄 데이터 로드
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await getSchedules();
      
      // 서버 응답을 Calendar 이벤트 형식으로 변환
      const calendarEvents = [];
      
      response.data.forEach(schedule => {
        // 시작 날짜와 종료 날짜 계산
        const startDate = moment(schedule.intakeStart);
        let endDate;
        
        if (schedule.intakeEnd) {
          endDate = moment(schedule.intakeEnd);
        } else if (schedule.intakeDistance) {
          // 종료일이 없고 기간이 있는 경우 종료일 계산
          endDate = moment(startDate).add(schedule.intakeDistance - 1, 'days');
        } else {
          // 기본값으로 시작일과 동일하게 설정
          endDate = moment(startDate);
        }
        
        // 복용 기간 동안의 이벤트 생성
        const currentDate = moment(startDate);
        
        while (currentDate.isSameOrBefore(endDate, 'day')) {
          const eventStart = new Date(
            currentDate.format('YYYY-MM-DD') + 'T' + getTimeForSlot(schedule.intakeTime)
          );
          const eventEnd = new Date(
            currentDate.format('YYYY-MM-DD') + 'T' + getEndTimeForSlot(schedule.intakeTime)
          );
          
          calendarEvents.push({
            id: `${schedule.scheduleId}-${currentDate.format('YYYYMMDD')}`,
            title: `${schedule.supplementName} 복용 (${schedule.intakeTime})`,
            start: eventStart,
            end: eventEnd,
            allDay: false,
            resource: schedule // 원본 데이터를 resource에 저장
          });
          
          currentDate.add(1, 'day');
        }
      });
      
      setEvents(calendarEvents);
      setLoading(false);
    } catch (error) {
      console.error('스케줄 조회 오류:', error);
      setError('일정을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };
  
  // 오늘의 복용 계획 조회
  const fetchTodayPlans = async () => {
    try {
      // 오늘 날짜를 기준으로 모든 시간대의 일정 조회
      const morningPlans = await getSchedulesByTime('아침');
      const afternoonPlans = await getSchedulesByTime('점심');  
      const eveningPlans = await getSchedulesByTime('저녁');
      
      // 데이터 합치기
      const allPlans = [
        ...morningPlans.data.map(plan => ({...plan, timeLabel: '아침'})),
        ...afternoonPlans.data.map(plan => ({...plan, timeLabel: '점심'})),
        ...eveningPlans.data.map(plan => ({...plan, timeLabel: '저녁'}))
      ];
      
      // 오늘 날짜에 해당하는 일정만 필터링
      const today = moment().format('YYYY-MM-DD');
      const todayOnly = allPlans.filter(plan => {
        const startDate = moment(plan.intakeStart).format('YYYY-MM-DD');
        const endDate = plan.intakeEnd ? moment(plan.intakeEnd).format('YYYY-MM-DD') : null;
        const duration = plan.intakeDistance || 0;
        
        // 시작일이 오늘보다 이전이거나 같고
        const afterStart = moment(startDate).isSameOrBefore(today);
        
        // 종료일이 있으면 종료일이 오늘보다 이후이거나 같은지 확인
        const beforeEnd = endDate ? moment(endDate).isSameOrAfter(today) : false;
        
        // 종료일이 없지만 기간이 있는 경우
        const withinDuration = !endDate && duration > 0 ? 
          moment(startDate).add(duration - 1, 'days').isSameOrAfter(today) : 
          false;
        
        return afterStart && (beforeEnd || withinDuration);
      });
      
      setTodayPlans(todayOnly);
      
      // 주간 계획 데이터 생성
      createWeeklyPlanData(allPlans);
    } catch (error) {
      console.error('오늘의 계획 조회 오류:', error);
    }
  };
  
  // 주간 계획 데이터 생성
  const createWeeklyPlanData = (allPlans) => {
    const weekPlan = {};
    const startOfWeek = moment().startOf('week');
    
    // 이번 주의 각 요일에 대한 데이터 생성
    for(let i = 0; i < 7; i++) {
      const currentDay = moment(startOfWeek).add(i, 'days');
      const dayName = currentDay.format('dddd'); // 'Monday', 'Tuesday', ...
      const dateString = currentDay.format('YYYY-MM-DD');
      
      // 해당 날짜의 일정 필터링
      const dayPlans = allPlans.filter(plan => {
        const startDate = moment(plan.intakeStart).format('YYYY-MM-DD');
        const endDate = plan.intakeEnd ? moment(plan.intakeEnd).format('YYYY-MM-DD') : null;
        const duration = plan.intakeDistance || 0;
        
        // 시작일이 현재 날짜보다 이전이거나 같고
        const afterStart = moment(startDate).isSameOrBefore(dateString);
        
        // 종료일이 있으면 종료일이 현재 날짜보다 이후이거나 같은지 확인
        const beforeEnd = endDate ? moment(endDate).isSameOrAfter(dateString) : false;
        
        // 종료일이 없지만 기간이 있는 경우
        const withinDuration = !endDate && duration > 0 ? 
          moment(startDate).add(duration - 1, 'days').isSameOrAfter(dateString) : 
          false;
        
        return afterStart && (beforeEnd || withinDuration);
      });
      
      // 일정 아이템 목록 및 상태 설정
      const items = dayPlans.map(plan => plan.supplementName);
      const status = moment(dateString).isBefore(moment(), 'day') 
        ? (items.length > 0 ? '완료' : '미완료') 
        : (items.length > 0 ? '예정' : '');
      
      weekPlan[dayName] = {
        items,
        status
      };
    }
    
    setWeeklyPlan(weekPlan);
  };
  
  // 시간대별 시작 시간 반환
  const getTimeForSlot = (slot) => {
    switch(slot) {
      case '아침': return '08:00:00';
      case '점심': return '12:00:00';
      case '저녁': return '18:00:00';
      default: return '08:00:00';
    }
  };
  
  // 시간대별 종료 시간 반환
  const getEndTimeForSlot = (slot) => {
    switch(slot) {
      case '아침': return '09:00:00';
      case '점심': return '13:00:00';
      case '저녁': return '19:00:00';
      default: return '09:00:00';
    }
  };
  
  // 드래그 앤 드롭으로 일정 이동
  const moveEvent = ({ event, start, end }) => {
    // 원본 이벤트 찾기
    const idx = events.findIndex(e => e.id === event.id);
    
    // 이벤트 업데이트
    const updatedEvent = { ...event, start, end };
    
    // 상태 업데이트
    const nextEvents = [...events];
    nextEvents.splice(idx, 1, updatedEvent);
    setEvents(nextEvents);
    
    // 서버에 업데이트 요청
    const originSchedule = event.resource;
    if (originSchedule) {
      // 시작 날짜 추출
      const newStartDate = moment(start).format('YYYY-MM-DD');
      
      // 업데이트할 일정 데이터
      const updatedSchedule = {
        ...originSchedule,
        intakeStart: newStartDate
      };
      
      // 서버에 업데이트 요청
      updateSchedule(originSchedule.scheduleId, updatedSchedule)
        .then(() => {
          console.log('일정 이동 완료');
          // 오늘 계획 갱신
          fetchSchedules();
          fetchTodayPlans();
        })
        .catch(error => {
          console.error('일정 업데이트 오류:', error);
          // 실패 시 원래 상태로 복원
          fetchSchedules();
        });
    }
  };
  
  // 이벤트 선택 처리
  const handleSelectEvent = (event) => {
    setCurrentEvent(event);
    setEditMode(true);
    
    // 원본 일정 데이터
    const originSchedule = event.resource;
    if (originSchedule) {
      // 복용 기간이 선택 옵션에 있는지 확인
      const durationOption = durationOptions.find(option => 
        option.value === originSchedule.intakeDistance
      );
      
      setSupplementForm({
        supplementName: originSchedule.supplementName,
        intakeTime: originSchedule.intakeTime,
        intakeStart: moment(originSchedule.intakeStart).format('YYYY-MM-DD'),
        intakeDistance: originSchedule.intakeDistance || 30,
        memo: originSchedule.memo || '',
        customDuration: !durationOption // 선택 옵션에 없으면 직접 입력으로 설정
      });
    }
    
    setShowEventModal(true);
  };
  
  // 날짜/시간 선택 처리
  const handleSelectSlot = (slotInfo) => {
    // 선택한 시간에 맞게 폼 초기화
    const selectedStartDate = moment(slotInfo.start).format('YYYY-MM-DD');
    const selectedHour = moment(slotInfo.start).hour();
    
    // 시간대 추정
    let timeSlot = '아침';
    if (selectedHour >= 11 && selectedHour < 15) {
      timeSlot = '점심';
    } else if (selectedHour >= 15) {
      timeSlot = '저녁';
    }
    
    setSupplementForm({
      supplementName: '',
      intakeTime: timeSlot,
      intakeStart: selectedStartDate,
      intakeDistance: 30,
      memo: '',
      customDuration: false
    });
    
    setEditMode(false);
    setCurrentEvent(null);
    setShowEventModal(true);
  };
  
  // 폼 입력 변경 처리
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'durationOption') {
      // 복용 기간 옵션 변경
      const optionValue = parseInt(value);
      if (optionValue === 0) {
        // 직접 입력 선택
        setSupplementForm(prev => ({
          ...prev,
          customDuration: true
        }));
      } else {
        // 미리 정의된 옵션 선택
        setSupplementForm(prev => ({
          ...prev,
          intakeDistance: optionValue,
          customDuration: false
        }));
      }
    } else {
      // 일반 입력 필드 변경
      setSupplementForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // 일정 저장 처리
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editMode && currentEvent) {
        // 기존 일정 수정
        const updatedSchedule = {
          ...currentEvent.resource,
          supplementName: supplementForm.supplementName,
          intakeTime: supplementForm.intakeTime,
          intakeStart: supplementForm.intakeStart,
          intakeDistance: parseInt(supplementForm.intakeDistance),
          memo: supplementForm.memo
        };
        
        await updateSchedule(currentEvent.resource.scheduleId, updatedSchedule);
        
      } else {
        // 새 일정 생성
        const newSchedule = {
          supplementName: supplementForm.supplementName,
          intakeTime: supplementForm.intakeTime,
          intakeStart: supplementForm.intakeStart,
          intakeDistance: parseInt(supplementForm.intakeDistance),
          memo: supplementForm.memo
        };
        
        await createSchedule(newSchedule);
      }
      
      // 모달 닫기 및 일정 새로고침
      setShowEventModal(false);
      fetchSchedules();
      fetchTodayPlans();
      
    } catch (error) {
      console.error('일정 저장 오류:', error);
      alert('일정 저장 중 오류가 발생했습니다.');
    }
  };
  
  // 일정 삭제 처리
  const handleDeleteSchedule = async () => {
    if (!currentEvent || !currentEvent.resource) return;
    
    if (window.confirm('정말 이 일정을 삭제하시겠습니까?')) {
      try {
        await deleteSchedule(currentEvent.resource.scheduleId);
        setShowEventModal(false);
        fetchSchedules();
        fetchTodayPlans();
      } catch (error) {
        console.error('일정 삭제 오류:', error);
        alert('일정 삭제 중 오류가 발생했습니다.');
      }
    }
  };
  
  // 오늘 일정 완료 처리
  const handleCompletePlan = (plan) => {
    // 여기서는 단순히 시각적으로만 표시
    Swal.fire({
      title: '복용 완료!',
      text: `${plan.supplementName} 복용을 완료했습니다.`,
      icon: 'success',
      confirmButtonText: '확인',
      confirmButtonColor: '#209696'
    });
  };
  
  // 상태별 색상 클래스
  const getStatusClass = (status) => {
    switch (status) {
      case '완료': return 'bg-green-200';
      case '미완료': return 'bg-red-200';
      case '예정': return 'bg-gray-200';
      default: return '';
    }
  };
  
  // 로딩 화면
  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          <span className="ml-3 text-lg">일정을 불러오는 중...</span>
        </div>
      </>
    );
  }
  
  // 오류 화면
  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md"
            >
              새로고침
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-gray-50 font-['Noto_Sans_KR'] min-h-screen">
      <Header />
      
      <main className="p-6 container mx-auto">
        <div className="max-w-7xl mx-auto">
          {/* 오늘의 영양제 섹션 */}
          <div id="today" className="p-6 bg-white shadow rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">오늘의 영양제</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 아침 섹션 */}
              <div className="bg-blue-50 shadow rounded-lg p-5">
                <div className="flex items-center mb-3">
                  <i className="fas fa-sun text-yellow-400 text-2xl"></i>
                  <h4 className="text-lg font-medium text-gray-900 ml-3">아침</h4>
                </div>
                {todayPlans.filter(item => item.intakeTime === '아침').length > 0 ? (
                  todayPlans.filter(item => item.intakeTime === '아침').map((item, index) => (
                    <div key={index} className="flex items-center justify-between mt-2 bg-white p-2 rounded shadow-sm">
                      <p className="text-sm text-gray-900">{item.supplementName}</p>
                      <button 
                        onClick={() => handleCompletePlan(item)}
                        className="ml-2 px-2 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors"
                      >
                        완료
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 mt-2 text-center">예정된 복용 없음</p>
                )}
              </div>
              
              {/* 점심 섹션 */}
              <div className="bg-orange-50 shadow rounded-lg p-5">
                <div className="flex items-center mb-3">
                  <i className="fas fa-cloud-sun text-orange-400 text-2xl"></i>
                  <h4 className="text-lg font-medium text-gray-900 ml-3">점심</h4>
                </div>
                {todayPlans.filter(item => item.intakeTime === '점심').length > 0 ? (
                  todayPlans.filter(item => item.intakeTime === '점심').map((item, index) => (
                    <div key={index} className="flex items-center justify-between mt-2 bg-white p-2 rounded shadow-sm">
                      <p className="text-sm text-gray-900">{item.supplementName}</p>
                      <button 
                        onClick={() => handleCompletePlan(item)}
                        className="ml-2 px-2 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors"
                      >
                        완료
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 mt-2 text-center">예정된 복용 없음</p>
                )}
              </div>
              
              {/* 저녁 섹션 */}
              <div className="bg-indigo-50 shadow rounded-lg p-5">
                <div className="flex items-center mb-3">
                  <i className="fas fa-moon text-blue-500 text-2xl"></i>
                  <h4 className="text-lg font-medium text-gray-900 ml-3">저녁</h4>
                </div>
                {todayPlans.filter(item => item.intakeTime === '저녁').length > 0 ? (
                  todayPlans.filter(item => item.intakeTime === '저녁').map((item, index) => (
                    <div key={index} className="flex items-center justify-between mt-2 bg-white p-2 rounded shadow-sm">
                      <p className="text-sm text-gray-900">{item.supplementName}</p>
                      <button 
                        onClick={() => handleCompletePlan(item)}
                        className="ml-2 px-2 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors"
                      >
                        완료
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 mt-2 text-center">예정된 복용 없음</p>
                )}
              </div>
            </div>
          </div>
          
          {/* 주간 복용 계획 */}
          <div id="weekly" className="bg-white shadow rounded-lg p-5 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📅 주간 복용 계획</h2>
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 text-center">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = new Date();
                day.setDate(day.getDate() - day.getDay() + i + 1);
                const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
                const status = weeklyPlan[dayName]?.status || '미완료';
                return (
                  <div key={i} className={`p-3 border rounded-lg cursor-pointer ${getStatusClass(status)}`}>
                    <p className="text-sm font-semibold">{day.toLocaleDateString('ko-KR', { weekday: 'short' })}</p>
                    <p className="text-xs text-gray-600">{day.toLocaleDateString()}</p>
                    <ul className="mt-1 text-xs text-gray-700">
                      {weeklyPlan[dayName]?.items?.map((item, j) => (
                        <li key={j}>✅ {item}</li>
                      )) || <li>❌ 없음</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 복용 일정 캘린더 */}
          <div id="calendar" className="p-6 bg-white shadow rounded-lg mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">복용 캘린더</h2>
              <div className="flex space-x-2">
                <button className="px-4 py-2 rounded-md bg-gray-200 text-gray-700">오늘</button>
                <button className="px-4 py-2 rounded-md bg-gray-200 text-gray-700">이전</button>
                <button className="px-4 py-2 rounded-md bg-gray-200 text-gray-700">다음</button>
              </div>
            </div>
            
            <div style={{ height: 600 }}>
              <StyledCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onEventDrop={moveEvent}
                resizable={false}
                selectable={true}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                views={['month', 'week', 'day']}
                defaultView="month"
                formats={{
                  dayFormat: (date, culture, localizer) =>
                    localizer.format(date, 'D', culture)
                }}
                messages={{
                  today: '오늘',
                  previous: '이전',
                  next: '다음',
                  month: '월',
                  week: '주',
                  day: '일',
                  noEventsInRange: '예정된 일정이 없습니다.'
                }}
              />
            </div>
          </div>
          
          {/* 영양제 복용 예약 버튼 */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => {
                setEditMode(false);
                setCurrentEvent(null);
                setSupplementForm({
                  supplementName: '',
                  intakeTime: '아침',
                  intakeStart: moment().format('YYYY-MM-DD'),
                  intakeDistance: 30,
                  memo: '',
                  customDuration: false
                });
                setShowEventModal(true);
              }}
              className="bg-teal-500 text-white px-6 py-3 rounded-md hover:bg-teal-600 transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>새 복용 일정 추가
            </button>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* 일정 추가/수정 모달 */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              {editMode ? '일정 수정' : '새 복용 일정'}
            </h3>
            
            <form onSubmit={handleScheduleSubmit}>
              {/* 영양제 이름 입력 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  영양제 이름
                </label>
                <input
                  type="text"
                  name="supplementName"
                  value={supplementForm.supplementName}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
              
              {/* 복용 시간대 선택 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  복용 시간대
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSupplementForm(prev => ({ ...prev, intakeTime: slot }))}
                      className={`py-2 px-3 rounded-md border text-center ${
                        supplementForm.intakeTime === slot 
                          ? 'bg-teal-500 text-white border-teal-500' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 복용 시작일 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  복용 시작일
                </label>
                <input
                  type="date"
                  name="intakeStart"
                  value={supplementForm.intakeStart}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
              
              {/* 복용 기간 - 선택 또는 직접 입력 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  복용 기간
                </label>
                <select
                  name="durationOption"
                  value={supplementForm.customDuration ? 0 : supplementForm.intakeDistance}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 mb-2"
                >
                  {durationOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                {supplementForm.customDuration && (
                  <div className="flex items-center">
                    <input
                      type="number"
                      name="intakeDistance"
                      value={supplementForm.intakeDistance}
                      onChange={handleFormChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                      required
                    />
                    <span className="ml-2">일</span>
                  </div>
                )}
              </div>
              
              {/* 메모 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모 (선택사항)
                </label>
                <textarea
                  name="memo"
                  value={supplementForm.memo}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  rows="3"
                ></textarea>
              </div>
              
              {/* 버튼 그룹 */}
              <div className="flex justify-between mt-6">
                <div>
                  {editMode && (
                    <button
                      type="button"
                      onClick={handleDeleteSchedule}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
                  >
                    {editMode ? '수정' : '추가'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Schedule;