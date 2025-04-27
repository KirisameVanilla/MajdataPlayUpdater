using MajdataPlayUpdater.Models;

namespace MajdataPlayUpdater.ViewModels;

public class MainViewModel : ViewModelBase
{
    public string Greeting => "Welcome to Avalonia!";
    public HttpHelper HttpHelper = new();
}
