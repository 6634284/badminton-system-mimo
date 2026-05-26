export interface RouteConfig {
  path: string;
  name: string;
  icon?: string;
  tabBar?: boolean;
}

export const routes: RouteConfig[] = [
  { path: 'pages/login/index', name: '登录' },
  { path: 'pages/home/index', name: '首页', tabBar: true },
];

export const tabBarRoutes = routes.filter((r) => r.tabBar);
