using Avalonia.Controls;
using Avalonia.Interactivity;

namespace MajdataPlayUpdater.Views;

public partial class MainWindow : Window
{
    private static readonly UpdaterView UpdaterView = new();
    private static readonly SettingsView SettingsView = new();
    public MainWindow()
    {
        InitializeComponent();

        MainContent.Content = UpdaterView;
    }

    public void NavigateToSettings() => MainContent.Content = SettingsView;
    public void NavigateToMain() => MainContent.Content = UpdaterView;

    private void OnGoMain(object? sender, RoutedEventArgs e) => NavigateToMain();
    private void OnGoSettings(object? sender, RoutedEventArgs e) => NavigateToSettings();
}