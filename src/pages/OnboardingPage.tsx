import { useNavigate } from 'react-router-dom';
import { Wordmark } from '../components/Wordmark';
import { useAppStore } from '../store/useAppStore';

export function OnboardingPage() {
  const navigate=useNavigate(); const setOnboarded=useAppStore(s=>s.setOnboarded); const onboarded=useAppStore(s=>s.onboarded);
  const start=()=>{setOnboarded();navigate('/home');};
  return <div className="onboarding-page">
    <div className="onboarding-inner">
      <div className="onboarding-space" />
      <Wordmark stacked className="onboarding-logo"/>
      <div className="ornament-rule" aria-hidden="true"><span/></div>
      <div className="onboarding-copy">
        <h1>Тренируйся.<br/>Понимай.<br/>Публикуй.</h1>
        <p>Пошаговое изучение LaTeX<br/>с объяснениями, примерами<br/>и практикой.</p>
      </div>
      <div className="math-watermark" aria-hidden="true"><span className="sigma">Σ</span><span className="alpha">α</span><i className="grid-h"/><i className="grid-v"/><i className="arc"/></div>
      <div className="onboarding-bottom">
        <button className="primary-button primary-button--large" onClick={start}>{onboarded?'Продолжить обучение':'Начать обучение'}</button>
        <div className="pagination-dots" aria-label="Экран 1 из 3"><span className="active"/><span/><span/></div>
      </div>
    </div>
  </div>;
}
