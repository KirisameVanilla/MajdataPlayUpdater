using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;

namespace MajdataPlayUpdater;

public partial class SettingsView : UserControl
{
    private readonly RoutedEventArgs _emptyRoutedEventArgs = new();
    public SettingsView()
    {
        InitializeComponent();
    }

    public void OnSwitchBack()
    {
        TxtProxy.Text = SettingsManager.Settings.ProxyUrl;
        TxtHashJsonEndPoint.Text = SettingsManager.Settings.HashJsonEndPoint;
        TxtDownloadEndPoint.Text = SettingsManager.Settings.DownloadEndPoint;

        TxtProxy_OnLostFocus(null, _emptyRoutedEventArgs);
        TxtHashJsonEndPoint_OnLostFocus(null, _emptyRoutedEventArgs);
        TxtDownloadEndPoint_OnLostFocus(null, _emptyRoutedEventArgs);
    }

    private void TxtProxy_OnLostFocus(object? sender, RoutedEventArgs e)
    {
        SetProxyHint.IsVisible = (TxtProxy.Text?.Trim() ?? string.Empty) == string.Empty;
    }

    private void TxtProxy_OnGotFocusGotFocus(object? sender, GotFocusEventArgs e)
    {
        SetProxyHint.IsVisible = false;
    }

    private void TxtHashJsonEndPoint_OnLostFocus(object? sender, RoutedEventArgs e)
    {
        SetHashJsonEndPointHint.IsVisible = (TxtHashJsonEndPoint.Text?.Trim() ?? string.Empty) == string.Empty;
    }

    private void TxtHashJsonEndPoint_OnGotFocusGotFocus(object? sender, GotFocusEventArgs e)
    {
        SetHashJsonEndPointHint.IsVisible = false;
    }

    private void TxtDownloadEndPoint_OnLostFocus(object? sender, RoutedEventArgs e)
    {
        SetDownloadEndPointHint.IsVisible = (TxtDownloadEndPoint.Text?.Trim() ?? string.Empty) == string.Empty;
    }

    private void TxtDownloadEndPoint_OnGotFocusGotFocus(object? sender, GotFocusEventArgs e)
    {
        SetDownloadEndPointHint.IsVisible = false;
    }

    private void BtnEnsureProxy_Click(object sender, RoutedEventArgs e)
    {
        var proxyUrl = TxtProxy.Text?.Trim() ?? string.Empty;
        SettingsManager.Settings.ProxyUrl = proxyUrl;
        SettingsManager.Save();
    }

    private void BtnEnsureHashJsonEndPoint_Click(object sender, RoutedEventArgs e)
    {
        var hashJsonEndPoint = TxtHashJsonEndPoint.Text?.Trim() ?? string.Empty;
        SettingsManager.Settings.HashJsonEndPoint = hashJsonEndPoint;
        SettingsManager.Save();
    }

    private void BtnEnsureDownloadEndPoint_Click(object sender, RoutedEventArgs e)
    {
        var downloadEndPoint = TxtDownloadEndPoint.Text?.Trim() ?? string.Empty;
        SettingsManager.Settings.DownloadEndPoint = downloadEndPoint;
        SettingsManager.Save();
    }
}