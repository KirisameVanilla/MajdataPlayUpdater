using System.Net.Http;
using System.Windows;

namespace MajdataPlayUpdater;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    public static HttpClient HttpClient { get; } = new HttpClient();

    protected override void OnExit(ExitEventArgs e)
    {
        HttpClient.Dispose();
        base.OnExit(e);
    }
}
