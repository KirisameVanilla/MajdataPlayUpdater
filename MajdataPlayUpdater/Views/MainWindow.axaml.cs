using Avalonia.Controls;
using Avalonia.Interactivity;

namespace MajdataPlayUpdater.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        // 默认显示 MainView
        MainContent.Content = new MainView();
    }

    // 你可以写一个方法用于切换页面
    public void NavigateToSettings()
    {
        MainContent.Content = null; // 假设你有 SettingsView
    }

    public void NavigateToMain()
    {
        MainContent.Content = new MainView();
    }

    private void OnGoMain(object? sender, RoutedEventArgs e)
    {
        NavigateToMain();
    }

    private void OnGoSettings(object? sender, RoutedEventArgs e)
    {
        NavigateToSettings();
    }
}