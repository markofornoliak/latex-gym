import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props={children:ReactNode};
type State={error:Error|null};

export class RouteErrorBoundary extends Component<Props,State>{
  state:State={error:null};

  static getDerivedStateFromError(error:Error):State{return {error};}

  componentDidCatch(error:Error,info:ErrorInfo){
    // Keep a real runtime failure visible to diagnostics instead of leaving a blank SPA root.
    console.error('LaTeX gym route render failed',error,info.componentStack);
  }

  private recover=()=>{
    this.setState({error:null});
    window.location.hash='#/home';
  };

  render(){
    if(!this.state.error)return this.props.children;
    return <main className="route-error" data-runtime-error={this.state.error.name}>
      <span className="eyebrow">ОШИБКА ИНТЕРФЕЙСА</span>
      <h1>Не удалось открыть этот экран</h1>
      <p>Черновики и прогресс сохранены локально. Вернитесь на главную и откройте раздел снова.</p>
      <button className="primary-button" type="button" onClick={this.recover}>На главную</button>
      <details><summary>Техническая информация</summary><code>{this.state.error.message}</code></details>
    </main>;
  }
}
